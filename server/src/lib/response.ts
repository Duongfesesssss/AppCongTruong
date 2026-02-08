import type { NextFunction, Request, Response } from "express";

import { AppError } from "./errors";

export const sendSuccess = (
  res: Response,
  data: unknown,
  meta: Record<string, unknown> | number = {},
  status?: number
) => {
  // Cho phép gọi sendSuccess(res, data, status) hoặc sendSuccess(res, data, meta, status)
  if (typeof meta === "number") {
    return res.status(meta).json({ success: true, data, meta: {} });
  }
  return res.status(status ?? 200).json({ success: true, data, meta });
};

export const sendError = (res: Response, error: AppError) => {
  return res.status(error.status).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? {}
    }
  });
};

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
