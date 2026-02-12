import fs from "node:fs";
import path from "node:path";

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ServiceException
} from "@aws-sdk/client-s3";

import { config } from "../lib/config";

export type StorageEntity = "drawing" | "photo";

export type StorageRecord = {
  id: string;
  entity: StorageEntity;
  storageKey: string;
  mimeType: string;
};

export type StorageCheckResult = {
  exists: boolean;
  foundKey?: string;
  triedKeys: string[];
};

export type LocalFileMatch = {
  found: boolean;
  filePath?: string;
  triedPaths: string[];
};

type HeadResult =
  | { exists: true }
  | { exists: false; notFound: true }
  | { exists: false; notFound: false; error: Error };

const asError = (value: unknown) => {
  if (value instanceof Error) return value;
  return new Error(typeof value === "string" ? value : JSON.stringify(value));
};

const asS3Error = (value: unknown) => {
  return value as S3ServiceException & {
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };
};

const isS3NotFoundError = (value: unknown) => {
  const err = asS3Error(value);
  const code = err.name || err.Code || "";
  const message = err.message || "";
  const status = err.$metadata?.httpStatusCode;
  return (
    code === "NoSuchKey" ||
    code === "NotFound" ||
    status === 404 ||
    message.includes("NoSuchKey") ||
    message.includes("NotFound") ||
    message.includes("specified key does not exist")
  );
};

const dedupe = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

export const assertS3Env = () => {
  if (config.storageType !== "s3") {
    throw new Error(`STORAGE_TYPE phải là 's3', hiện tại là '${config.storageType}'`);
  }
  if (!config.aws.s3Bucket) {
    throw new Error("Thiếu AWS_S3_BUCKET");
  }
  if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
    throw new Error("Thiếu AWS_ACCESS_KEY_ID hoặc AWS_SECRET_ACCESS_KEY");
  }
};

export const getEntityPrefix = (entity: StorageEntity) => {
  return entity === "drawing" ? "drawings" : "photos";
};

export const buildS3KeyCandidates = (storageKey: string, entity: StorageEntity) => {
  const prefix = getEntityPrefix(entity);
  const safeKey = path.basename(storageKey);
  const prefixedKey = `${prefix}/${safeKey}`;

  const keys = storageKey.startsWith(`${prefix}/`)
    ? [storageKey, safeKey]
    : [storageKey, prefixedKey];

  return dedupe(keys);
};

const tryHeadObject = async (
  client: S3Client,
  bucket: string,
  key: string
): Promise<HeadResult> => {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { exists: true };
  } catch (err) {
    if (isS3NotFoundError(err)) {
      return { exists: false, notFound: true };
    }
    return { exists: false, notFound: false, error: asError(err) };
  }
};

export const checkStorageRecordOnS3 = async (
  client: S3Client,
  bucket: string,
  record: StorageRecord
): Promise<StorageCheckResult> => {
  const triedKeys = buildS3KeyCandidates(record.storageKey, record.entity);

  for (const key of triedKeys) {
    const head = await tryHeadObject(client, bucket, key);
    if (head.exists) {
      return { exists: true, foundKey: key, triedKeys };
    }
    if (!head.notFound) {
      throw head.error;
    }
  }

  return { exists: false, triedKeys };
};

const resolveLocalUploadRoots = () => {
  const roots = [
    process.env.LOCAL_UPLOAD_DIR
      ? path.isAbsolute(process.env.LOCAL_UPLOAD_DIR)
        ? process.env.LOCAL_UPLOAD_DIR
        : path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_DIR)
      : "",
    path.join(process.cwd(), "uploads"),
    path.join(process.cwd(), "server", "uploads"),
    "/app/uploads"
  ];

  return dedupe(roots);
};

export const findLocalFileForRecord = (record: StorageRecord): LocalFileMatch => {
  const prefix = getEntityPrefix(record.entity);
  const safeKey = path.basename(record.storageKey);
  const roots = resolveLocalUploadRoots();
  const triedPaths = dedupe(
    roots.flatMap((root) => [
      path.join(root, prefix, safeKey),
      path.join(root, record.storageKey),
      path.join(root, prefix, record.storageKey)
    ])
  );

  for (const filePath of triedPaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return { found: true, filePath, triedPaths };
    }
  }

  return { found: false, triedPaths };
};

export const uploadLocalFileToS3 = async (params: {
  client: S3Client;
  bucket: string;
  key: string;
  filePath: string;
  mimeType: string;
}) => {
  const stream = fs.createReadStream(params.filePath);
  await params.client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: stream,
      ContentType: params.mimeType || undefined
    })
  );
};

export const runWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
) => {
  const safeConcurrency = Math.max(1, concurrency);
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(safeConcurrency, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
};
