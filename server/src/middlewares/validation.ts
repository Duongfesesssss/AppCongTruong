import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

import { errors } from "../lib/errors";

export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params
  });

  if (!result.success) {
    const details = result.error.flatten();
    return next(errors.validation("Dữ liệu không hợp lệ", details));
  }

  req.body = result.data.body ?? req.body;
  req.query = result.data.query ?? req.query;
  req.params = result.data.params ?? req.params;

  return next();
};
