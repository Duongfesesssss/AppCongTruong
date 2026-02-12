import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

import { S3Client } from "@aws-sdk/client-s3";
import mongoose from "mongoose";

import { connectDb } from "../lib/db";
import { logger } from "../lib/logger";
import { config } from "../lib/config";
import { DrawingModel } from "../drawings/drawing.model";
import { PhotoModel } from "../photos/photo.model";
import {
  assertS3Env,
  checkStorageRecordOnS3,
  runWithConcurrency,
  type StorageRecord
} from "./s3-recovery-utils";

type AuditMissingItem = {
  id: string;
  entity: "drawing" | "photo";
  storageKey: string;
  mimeType: string;
  triedKeys: string[];
};

type AuditFoundItem = {
  id: string;
  entity: "drawing" | "photo";
  storageKey: string;
  mimeType: string;
  resolvedKey: string;
};

const parseNumberEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseLimitEnv = (value: string | undefined) => {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getOutputPath = () => {
  const custom = process.env.AUDIT_OUTPUT?.trim();
  if (custom) {
    return path.isAbsolute(custom) ? custom : path.resolve(process.cwd(), custom);
  }
  return path.join(process.cwd(), "tmp", `s3-audit-${Date.now()}.json`);
};

const createS3Client = () => {
  return new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey
    }
  });
};

const toStorageRecord = (
  entity: "drawing" | "photo",
  doc: { _id: unknown; storageKey: string; mimeType: string }
): StorageRecord => ({
  id: String(doc._id),
  entity,
  storageKey: doc.storageKey,
  mimeType: doc.mimeType
});

const audit = async () => {
  assertS3Env();
  await connectDb();
  try {
    const bucket = config.aws.s3Bucket;
    const concurrency = parseNumberEnv(process.env.AUDIT_CONCURRENCY, 8);
    const limit = parseLimitEnv(process.env.AUDIT_LIMIT);

    const [drawingDocs, photoDocs] = await Promise.all([
      DrawingModel.find(
        { storageKey: { $exists: true, $ne: "" } },
        { _id: 1, storageKey: 1, mimeType: 1 }
      )
        .sort({ createdAt: -1 })
        .limit(limit || 0)
        .lean(),
      PhotoModel.find(
        { storageKey: { $exists: true, $ne: "" } },
        { _id: 1, storageKey: 1, mimeType: 1 }
      )
        .sort({ createdAt: -1 })
        .limit(limit || 0)
        .lean()
    ]);

    const records = [
      ...drawingDocs.map((doc) => toStorageRecord("drawing", doc)),
      ...photoDocs.map((doc) => toStorageRecord("photo", doc))
    ];

    logger.info(
      {
        drawings: drawingDocs.length,
        photos: photoDocs.length,
        total: records.length,
        concurrency,
        limit
      },
      "Bat dau audit S3"
    );

    const client = createS3Client();
    const missingItems: AuditMissingItem[] = [];
    const foundItems: AuditFoundItem[] = [];

    await runWithConcurrency(records, concurrency, async (record, index) => {
      const result = await checkStorageRecordOnS3(client, bucket, record);
      if (result.exists && result.foundKey) {
        foundItems.push({
          id: record.id,
          entity: record.entity,
          storageKey: record.storageKey,
          mimeType: record.mimeType,
          resolvedKey: result.foundKey
        });
      } else {
        missingItems.push({
          id: record.id,
          entity: record.entity,
          storageKey: record.storageKey,
          mimeType: record.mimeType,
          triedKeys: result.triedKeys
        });
      }

      if ((index + 1) % 100 === 0 || index + 1 === records.length) {
        logger.info(
          {
            processed: index + 1,
            total: records.length,
            missing: missingItems.length
          },
          "Audit dang chay"
        );
      }
    });

    const summary = {
      scannedTotal: records.length,
      scannedDrawings: drawingDocs.length,
      scannedPhotos: photoDocs.length,
      missingTotal: missingItems.length,
      missingDrawings: missingItems.filter((item) => item.entity === "drawing").length,
      missingPhotos: missingItems.filter((item) => item.entity === "photo").length,
      foundTotal: foundItems.length
    };

    const output = {
      generatedAt: new Date().toISOString(),
      bucket,
      region: config.aws.region,
      summary,
      missing: {
        drawings: missingItems.filter((item) => item.entity === "drawing"),
        photos: missingItems.filter((item) => item.entity === "photo")
      },
      found: foundItems
    };

    const outputPath = getOutputPath();
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

    logger.info({ outputPath, summary }, "Audit S3 hoan tat");
  } finally {
    await mongoose.connection.close();
  }
};

audit()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, "Audit S3 that bai");
    process.exit(1);
  });
