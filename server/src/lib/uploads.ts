import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

import multer from "multer";

import { errors } from "./errors";

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

  const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
    if (!options.allowedMime.includes(file.mimetype)) {
      return cb(errors.validation("Loai file khong ho tro"));
    }
    return cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: options.maxMb * 1024 * 1024 }
  });
};
