import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { AppError, errors } from "../lib/errors";
import { sendError } from "../lib/response";
import { logger } from "../lib/logger";
import { isProd } from "../lib/config";

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const error = errors.validation("Upload thất bại", { code: err.code });
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
