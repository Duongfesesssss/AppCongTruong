import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";

import { config, isProd } from "../lib/config";
import { asyncHandler, sendSuccess } from "../lib/response";
import { errors } from "../lib/errors";
import { loginSchema, refreshSchema, registerSchema } from "../users/user.schema";
import { validate } from "../middlewares/validation";
import { UserModel } from "../users/user.model";
import { hashToken } from "../lib/utils";
import { requireAuth } from "../middlewares/require-auth";
import { loginLimiter } from "../middlewares/rate-limit";
import { parseDurationToMs } from "../lib/time";

const router = Router();

const signAccessToken = (user: { id: string; email: string; name?: string }) => {
  return jwt.sign(user, config.jwtAccessSecret, { expiresIn: config.accessTokenTtl } as SignOptions);
};

const signRefreshToken = (user: { id: string; email: string }) => {
  return jwt.sign(user, config.jwtRefreshSecret, { expiresIn: config.refreshTokenTtl } as SignOptions);
};

// Register endpoint
router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body as { name: string; email: string; password: string };

    // Check if email already exists
    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw errors.conflict("Email đã được sử dụng");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await UserModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash
    });

    // Auto login after register
    const accessToken = signAccessToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });

    const refreshToken = signRefreshToken({
      id: user._id.toString(),
      email: user.email
    });

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: parseDurationToMs(config.refreshTokenTtl, 1000 * 60 * 60 * 24 * 7)
    });

    return sendSuccess(res, {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    }, 201);
  })
);

router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw errors.unauthorized("Thông tin đăng nhập không đúng");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw errors.unauthorized("Thông tin đăng nhập không đúng");
    }

    const accessToken = signAccessToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });

    const refreshToken = signRefreshToken({
      id: user._id.toString(),
      email: user.email
    });

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: parseDurationToMs(config.refreshTokenTtl, 1000 * 60 * 60 * 24 * 7)
    });

    return sendSuccess(res, {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  })
);

router.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const tokenFromCookie = req.cookies?.refreshToken as string | undefined;
    const tokenFromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    const refreshToken = tokenFromCookie || tokenFromBody;

    if (!refreshToken) {
      throw errors.unauthorized("Không có refresh token");
    }

    let payload: { id: string; email: string };
    try {
      payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
        id: string;
        email: string;
      };
    } catch {
      throw errors.unauthorized("Refresh token không hợp lệ");
    }

    const user = await UserModel.findById(payload.id);
    if (!user || !user.refreshTokenHash) {
      throw errors.unauthorized("Refresh token không hợp lệ");
    }

    if (user.refreshTokenHash !== hashToken(refreshToken)) {
      throw errors.unauthorized("Refresh token không hợp lệ");
    }

    const accessToken = signAccessToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });

    const newRefresh = signRefreshToken({
      id: user._id.toString(),
      email: user.email
    });

    user.refreshTokenHash = hashToken(newRefresh);
    await user.save();

    res.cookie("refreshToken", newRefresh, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: parseDurationToMs(config.refreshTokenTtl, 1000 * 60 * 60 * 24 * 7)
    });

    return sendSuccess(res, { accessToken });
  })
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user) {
      await UserModel.findByIdAndUpdate(req.user.id, { $unset: { refreshTokenHash: 1 } });
    }

    res.clearCookie("refreshToken");
    return sendSuccess(res, { ok: true });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw errors.unauthorized();
    return sendSuccess(res, { user: req.user });
  })
);

export default router;
