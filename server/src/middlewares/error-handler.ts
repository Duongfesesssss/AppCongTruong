import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { AppError, errors } from "../lib/errors";
import { sendError } from "../lib/response";
import { logger } from "../lib/logger";
import { isProd } from "../lib/config";

const DUPLICATE_KEY_ERROR_CODE = 11000;

const isDuplicateKeyError = (
  value: unknown
): value is {
  code: number;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
} => {
  if (!value || typeof value !== "object") return false;
  return (value as { code?: number }).code === DUPLICATE_KEY_ERROR_CODE;
};

const buildDuplicateMessage = (field?: string) => {
  if (!field) return "Dữ liệu đã tồn tại";
  if (field === "email") return "Email đã tồn tại";
  if (field === "code") return "Mã project đã tồn tại";
  if (field === "pinCode") return "Pin code đã tồn tại";
  return `${field} đã tồn tại`;
};

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const error = errors.validation("Upload thất bại", { code: err.code });
    return sendError(res, error);
  }

  if (isDuplicateKeyError(err)) {
    const key = Object.keys(err.keyPattern ?? {})[0];
    const error = errors.conflict(buildDuplicateMessage(key));
    return sendError(res, error);
  }

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err }, "Unhandled app error");
    }
    return sendError(res, err);
  }

  logger.error({ err }, "Unhandled error");
  const error = errors.internal(isProd ? "Lỗi server" : err.message);
  return sendError(res, error);
};
