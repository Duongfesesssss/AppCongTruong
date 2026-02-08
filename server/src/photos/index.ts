import path from "node:path";
import fs from "node:fs";

import { Router } from "express";
import imageSize from "image-size";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { createUploader } from "../lib/uploads";
import { config } from "../lib/config";
import { uploadLimiter } from "../middlewares/rate-limit";
import { TaskModel } from "../tasks/task.model";
import { ProjectModel } from "../projects/project.model";
import { PhotoModel } from "./photo.model";
import { createPhotoSchema, photoIdSchema, updatePhotoSchema } from "./photo.schema";

const router = Router();
const upload = createUploader({
  subDir: "photos",
  allowedMime: ["image/jpeg", "image/png", "image/webp"],
  maxMb: config.uploadMaxImageMb
});

router.post(
  "/",
  requireAuth,
  uploadLimiter,
  upload.single("file"),
  validate(createPhotoSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw errors.validation("Yêu cầu file upload");
    }

    const { taskId, name, description, location, category, measuredBy } = req.body as {
      taskId: string;
      name?: string;
      description?: string;
      location?: string;
      category?: string;
      measuredBy?: string;
    };
    const task = await TaskModel.findById(taskId);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Task không tồn tại hoặc không có quyền");

    let width: number | undefined;
    let height: number | undefined;
    try {
      const dim = imageSize(req.file.path);
      width = dim.width ?? undefined;
      height = dim.height ?? undefined;
    } catch {
      width = undefined;
      height = undefined;
    }

    const photo = await PhotoModel.create({
      taskId: task._id,
      drawingId: task.drawingId,
      storageKey: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      width,
      height,

      // Photo metadata
      name,
      description,
      location,
      category,
      measuredBy,
      measuredAt: new Date()
    });

    return sendSuccess(res, photo, {}, 201);
  })
);

router.patch(
  "/:id",
  requireAuth,
  validate(photoIdSchema),
  validate(updatePhotoSchema),
  asyncHandler(async (req, res) => {
    const photo = await PhotoModel.findById(req.params.id);
    if (!photo) throw errors.notFound("Photo không tồn tại");

    // Check ownership through task
    const task = await TaskModel.findById(photo.taskId);
    if (!task) throw errors.notFound("Photo không tồn tại");

    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Photo không tồn tại hoặc không có quyền");

    photo.annotations = req.body.annotations;
    await photo.save();

    return sendSuccess(res, photo);
  })
);

router.get(
  "/:id/file",
  requireAuth,
  validate(photoIdSchema),
  asyncHandler(async (req, res) => {
    const photo = await PhotoModel.findById(req.params.id);
    if (!photo) throw errors.notFound("Photo không tồn tại");

    // Check ownership through task
    const task = await TaskModel.findById(photo.taskId);
    if (!task) throw errors.notFound("Photo không tồn tại");

    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Photo không tồn tại hoặc không có quyền");

    const safeKey = path.basename(photo.storageKey);
    const filePath = path.join(process.cwd(), "uploads", "photos", safeKey);
    if (!fs.existsSync(filePath)) throw errors.notFound("File không tồn tại");

    // CORS headers cho embedded content
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Content-Type", photo.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${safeKey}"`);

    fs.createReadStream(filePath).pipe(res);
  })
);

router.delete(
  "/:id",
  requireAuth,
  validate(photoIdSchema),
  asyncHandler(async (req, res) => {
    const photo = await PhotoModel.findById(req.params.id);
    if (!photo) throw errors.notFound("Photo không tồn tại");

    // Check ownership through task
    const task = await TaskModel.findById(photo.taskId);
    if (!task) throw errors.notFound("Photo không tồn tại");

    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Photo không tồn tại hoặc không có quyền");

    // Delete file from disk
    const safeKey = path.basename(photo.storageKey);
    const filePath = path.join(process.cwd(), "uploads", "photos", safeKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await PhotoModel.deleteOne({ _id: req.params.id });
    return sendSuccess(res, { ok: true });
  })
);

export default router;
