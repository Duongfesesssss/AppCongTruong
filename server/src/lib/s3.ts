import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { config } from "./config";
import { logger } from "./logger";

// Initialize S3 client
let s3Client: S3Client | null = null;

export const getS3Client = (): S3Client => {
  if (!s3Client) {
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
      throw new Error("AWS credentials not configured");
    }

    s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
      }
    });

    logger.info({ region: config.aws.region }, "S3 client initialized");
  }

  return s3Client;
};

/**
 * Upload file to S3
 */
export const uploadToS3 = async (
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ key: string; url: string }> => {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType
  });

  await client.send(command);

  const url = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

  logger.info({ key, mimeType }, "File uploaded to S3");

  return { key, url };
};

/**
 * Delete file from S3
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key
  });

  await client.send(command);

  logger.info({ key }, "File deleted from S3");
};

/**
 * Get signed URL for private file access (valid for 1 hour)
 */
export const getS3SignedUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key
  });

  const url = await getSignedUrl(client, command, { expiresIn });

  return url;
};

// In-memory TTL cache cho presigned URLs để tránh ký lại mỗi request
const presignedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Get signed URL với in-memory cache (tránh ký lại quá nhiều lần)
 * Tự động đính kèm Content-Disposition và Content-Type vào URL
 */
export const getS3SignedUrlCached = async (
  key: string,
  options: { expiresIn?: number; contentDisposition?: string; contentType?: string } = {}
): Promise<string> => {
  const { expiresIn = 3600, contentDisposition, contentType } = options;
  const cacheKey = `${key}::${contentDisposition ?? ""}::${contentType ?? ""}`;

  const cached = presignedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 120_000) {
    // Còn hợp lệ hơn 2 phút → dùng lại
    return cached.url;
  }

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    ...(contentDisposition && { ResponseContentDisposition: contentDisposition }),
    ...(contentType && { ResponseContentType: contentType })
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  presignedUrlCache.set(cacheKey, { url, expiresAt: Date.now() + expiresIn * 1000 });

  // Dọn cache cũ sau mỗi 100 entries
  if (presignedUrlCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of presignedUrlCache.entries()) {
      if (v.expiresAt < now) presignedUrlCache.delete(k);
    }
  }

  return url;
};

/**
 * Find the first valid S3 key among candidates (HeadObject check, no download)
 */
export const findValidS3Key = async (candidateKeys: string[]): Promise<string> => {
  const client = getS3Client();
  for (const key of candidateKeys) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: config.aws.s3Bucket, Key: key }));
      return key;
    } catch (err) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      const status = e.$metadata?.httpStatusCode ?? 0;
      if (e.name === "NoSuchKey" || e.name === "NotFound" || status === 404 || status === 403) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("S3 object not found for any candidate key");
};

/**
 * Get public URL for S3 object (for public buckets)
 */
export const getS3PublicUrl = (key: string): string => {
  return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
};

/**
 * Get readable stream from S3 (for proxying through server)
 */
export const getS3Stream = async (key: string): Promise<Readable> => {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key
  });

  const response = await client.send(command);

  if (!response.Body) {
    throw new Error("No body in S3 response");
  }

  return response.Body as Readable;
};
