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
  findLocalFileForRecord,
  runWithConcurrency,
  uploadLocalFileToS3,
  type StorageRecord
} from "./s3-recovery-utils";

type MissingInputItem = {
  id: string;
  entity: "drawing" | "photo";
  storageKey: string;
  mimeType: string;
  triedKeys?: string[];
};

type RestoreResultItem = {
  id: string;
  entity: "drawing" | "photo";
  storageKey: string;
  status:
    | "already_exists"
    | "no_local_file"
    | "dry_run_ready"
    | "restored"
    | "restore_failed";
  usedS3Key?: string;
  localFilePath?: string;
  triedLocalPaths?: string[];
  triedS3Keys?: string[];
  error?: string;
};

const parseNumberEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
};

const getOutputPath = () => {
  const custom = process.env.RESTORE_OUTPUT?.trim();
  if (custom) {
    return path.isAbsolute(custom) ? custom : path.resolve(process.cwd(), custom);
  }
  return path.join(process.cwd(), "tmp", `s3-restore-${Date.now()}.json`);
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

const parseAuditFile = (filePath: string): MissingInputItem[] => {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolute, "utf-8");
  const parsed = JSON.parse(raw) as {
    missing?: { drawings?: Omit<MissingInputItem, "entity">[]; photos?: Omit<MissingInputItem, "entity">[] };
  };

  const drawings = (parsed.missing?.drawings ?? []).map((item) => ({
    ...item,
    entity: "drawing" as const
  }));
  const photos = (parsed.missing?.photos ?? []).map((item) => ({
    ...item,
    entity: "photo" as const
  }));
  return [...drawings, ...photos];
};

const loadMissingFromDb = async (client: S3Client): Promise<MissingInputItem[]> => {
  await connectDb();
  try {
    const bucket = config.aws.s3Bucket;
    const concurrency = parseNumberEnv(process.env.RESTORE_CHECK_CONCURRENCY, 8);
    const [drawingDocs, photoDocs] = await Promise.all([
      DrawingModel.find(
        { storageKey: { $exists: true, $ne: "" } },
        { _id: 1, storageKey: 1, mimeType: 1 }
      ).lean(),
      PhotoModel.find(
        { storageKey: { $exists: true, $ne: "" } },
        { _id: 1, storageKey: 1, mimeType: 1 }
      ).lean()
    ]);

    const records = [
      ...drawingDocs.map((doc) => toStorageRecord("drawing", doc)),
      ...photoDocs.map((doc) => toStorageRecord("photo", doc))
    ];

    const missing: MissingInputItem[] = [];
    await runWithConcurrency(records, concurrency, async (record) => {
      const result = await checkStorageRecordOnS3(client, bucket, record);
      if (!result.exists) {
        missing.push({
          id: record.id,
          entity: record.entity,
          storageKey: record.storageKey,
          mimeType: record.mimeType,
          triedKeys: result.triedKeys
        });
      }
    });

    return missing;
  } finally {
    await mongoose.connection.close();
  }
};

const restore = async () => {
  assertS3Env();
  const bucket = config.aws.s3Bucket;
  const client = createS3Client();
  const dryRun = parseBooleanEnv(process.env.DRY_RUN, true);
  const concurrency = parseNumberEnv(process.env.RESTORE_CONCURRENCY, 3);
  const auditFile = process.env.AUDIT_FILE?.trim();

  const missingItems = auditFile ? parseAuditFile(auditFile) : await loadMissingFromDb(client);
  logger.info(
    { missingCount: missingItems.length, dryRun, concurrency, auditFile: auditFile || null },
    "Bat dau restore file thieu tren S3"
  );

  const results = await runWithConcurrency(missingItems, concurrency, async (item) => {
    const record: StorageRecord = {
      id: item.id,
      entity: item.entity,
      storageKey: item.storageKey,
      mimeType: item.mimeType
    };

    const existsNow = await checkStorageRecordOnS3(client, bucket, record);
    if (existsNow.exists) {
      return {
        id: item.id,
        entity: item.entity,
        storageKey: item.storageKey,
        status: "already_exists",
        usedS3Key: existsNow.foundKey
      } satisfies RestoreResultItem;
    }

    const localMatch = findLocalFileForRecord(record);
    if (!localMatch.found || !localMatch.filePath) {
      return {
        id: item.id,
        entity: item.entity,
        storageKey: item.storageKey,
        status: "no_local_file",
        triedLocalPaths: localMatch.triedPaths,
        triedS3Keys: existsNow.triedKeys
      } satisfies RestoreResultItem;
    }

    if (dryRun) {
      return {
        id: item.id,
        entity: item.entity,
        storageKey: item.storageKey,
        status: "dry_run_ready",
        localFilePath: localMatch.filePath,
        triedS3Keys: existsNow.triedKeys
      } satisfies RestoreResultItem;
    }

    try {
      await uploadLocalFileToS3({
        client,
        bucket,
        key: item.storageKey,
        filePath: localMatch.filePath,
        mimeType: item.mimeType
      });

      const verify = await checkStorageRecordOnS3(client, bucket, record);
      if (!verify.exists) {
        return {
          id: item.id,
          entity: item.entity,
          storageKey: item.storageKey,
          status: "restore_failed",
          localFilePath: localMatch.filePath,
          triedS3Keys: verify.triedKeys,
          error: "Upload xong nhung khong xac minh duoc tren S3"
        } satisfies RestoreResultItem;
      }

      return {
        id: item.id,
        entity: item.entity,
        storageKey: item.storageKey,
        status: "restored",
        localFilePath: localMatch.filePath,
        usedS3Key: verify.foundKey
      } satisfies RestoreResultItem;
    } catch (err) {
      return {
        id: item.id,
        entity: item.entity,
        storageKey: item.storageKey,
        status: "restore_failed",
        localFilePath: localMatch.filePath,
        error: err instanceof Error ? err.message : String(err)
      } satisfies RestoreResultItem;
    }
  });

  const summary = {
    inputMissing: missingItems.length,
    alreadyExists: results.filter((item) => item.status === "already_exists").length,
    noLocalFile: results.filter((item) => item.status === "no_local_file").length,
    dryRunReady: results.filter((item) => item.status === "dry_run_ready").length,
    restored: results.filter((item) => item.status === "restored").length,
    restoreFailed: results.filter((item) => item.status === "restore_failed").length
  };

  const output = {
    generatedAt: new Date().toISOString(),
    dryRun,
    bucket,
    region: config.aws.region,
    summary,
    results
  };

  const outputPath = getOutputPath();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

  logger.info({ outputPath, summary }, "Restore hoan tat");
};

restore()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, "Restore that bai");
    process.exit(1);
  });
