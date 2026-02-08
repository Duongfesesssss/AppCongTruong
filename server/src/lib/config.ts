import "dotenv/config";

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 4000),
  mongoUri: process.env.MONGO_URI ?? process.env.DATABASE_URL ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? "7d",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  uploadMaxPdfMb: toNumber(process.env.UPLOAD_MAX_PDF_MB, 100),
  uploadMaxImageMb: toNumber(process.env.UPLOAD_MAX_IMAGE_MB, 20),

  // Storage configuration (local or s3)
  storageType: (process.env.STORAGE_TYPE ?? "local") as "local" | "s3",

  // AWS S3 configuration (only needed if storageType is 's3')
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    region: process.env.AWS_REGION ?? "ap-southeast-1",
    s3Bucket: process.env.AWS_S3_BUCKET ?? ""
  }
};

export const isProd = config.nodeEnv === "production";
export const isDev = !isProd;
