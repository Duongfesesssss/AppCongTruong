import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

/**
 * Get public URL for S3 object (for public buckets)
 */
export const getS3PublicUrl = (key: string): string => {
  return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
};
