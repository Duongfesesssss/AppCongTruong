import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { config } from "../lib/config";
import { errors } from "../lib/errors";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  // 1. Authorization header (uu tien)
  let token: string | undefined;
  const header = req.headers.authorization;
  if (header) {
    const [type, value] = header.split(" ");
    if (type === "Bearer" && value) {
      token = value;
    }
  }

  // 2. Fallback: query parameter (cho <object>, <img> tags khong gui duoc header)
  if (!token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    return next(errors.unauthorized());
  }

  try {
    const payload = jwt.verify(token, config.jwtAccessSecret) as AuthUser;
    req.user = payload;
    return next();
  } catch {
    return next(errors.unauthorized());
  }
};
