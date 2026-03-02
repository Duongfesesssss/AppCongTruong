import { Router } from "express";

import { requireAuth } from "../middlewares/require-auth";
import { validate } from "../middlewares/validation";
import { updateProfileSchema } from "./user.schema";
import { UserModel } from "./user.model";
import { errors } from "../lib/errors";
import { createUploader, handleFileUpload } from "../lib/uploads";

const router = Router();

const avatarUploader = createUploader({
  subDir: "photos",
  allowedMime: ["image/jpeg", "image/png", "image/webp"],
  maxMb: 5
});

// GET /users/me - Get current user profile
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user?.id).select("-passwordHash -refreshTokenHash");
    if (!user) {
      throw errors.unauthorized("Người dùng không tồn tại");
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /users/me - Update current user profile
router.patch("/me", requireAuth, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const { name, bio, phone, metadata } = req.body;

    const updateData: Partial<{
      name: string;
      bio: string;
      phone: string;
      metadata: Record<string, unknown>;
    }> = {};

    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (phone !== undefined) updateData.phone = phone;
    if (metadata !== undefined) updateData.metadata = metadata;

    const user = await UserModel.findByIdAndUpdate(req.user?.id, updateData, {
      new: true,
      runValidators: true
    }).select("-passwordHash -refreshTokenHash");

    if (!user) {
      throw errors.unauthorized("Người dùng không tồn tại");
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /users/me/avatar - Upload avatar
router.post(
  "/me/avatar",
  requireAuth,
  avatarUploader.single("avatar"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw errors.validation("Vui lòng chọn file ảnh");
      }

      const avatarKey = await handleFileUpload(req.file, "avatars");

      const user = await UserModel.findByIdAndUpdate(
        req.user?.id,
        { avatarUrl: avatarKey },
        { new: true }
      ).select("-passwordHash -refreshTokenHash");

      if (!user) {
        throw errors.unauthorized("Người dùng không tồn tại");
      }

      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
