import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

import multer from "multer";

import { errors } from "./errors";
import { config } from "./config";
import { uploadToS3 } from "./s3";

const mimeToExt: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

type UploadOptions = {
  subDir: "drawings" | "photos";
  allowedMime: string[];
  maxMb: number;
};

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const createUploader = (options: UploadOptions) => {
  const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
    if (!options.allowedMime.includes(file.mimetype)) {
      return cb(errors.validation("Loai file khong ho tro"));
    }
    return cb(null, true);
  };

  // For S3 storage, use memory storage and handle upload in route handler
  if (config.storageType === "s3") {
    return multer({
      storage: multer.memoryStorage(),
      fileFilter,
      limits: { fileSize: options.maxMb * 1024 * 1024 }
    });
  }

  // For local storage, use disk storage
  const baseDir = path.join(process.cwd(), "uploads", options.subDir);
  ensureDir(baseDir);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, baseDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || mimeToExt[file.mimetype] || "";
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  });

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: options.maxMb * 1024 * 1024 }
  });
};

/**
 * Helper to handle file upload to appropriate storage
 * Returns the storage key to save in database
 */
export const handleFileUpload = async (
  file: Express.Multer.File,
  subDir: string
): Promise<string> => {
  if (config.storageType === "s3") {
    // Upload to S3
    const ext = path.extname(file.originalname) || mimeToExt[file.mimetype] || "";
    const filename = `${crypto.randomUUID()}${ext}`;
    const key = `${subDir}/${filename}`;

    await uploadToS3(key, file.buffer, file.mimetype);

    return key;
  } else {
    // File already saved to disk by multer diskStorage
    return file.filename;
  }
};
