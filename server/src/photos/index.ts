import path from "node:path";
import fs from "node:fs";

import { Router } from "express";
import imageSize from "image-size";
import * as XLSX from "xlsx";

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

// Upload Excel files for importing annotations
const excelUpload = createUploader({
  subDir: "photos", // Use photos subdirectory for temp files
  allowedMime: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ],
  maxMb: 5
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

// Import annotations from Excel
router.post(
  "/:id/import-annotations",
  requireAuth,
  excelUpload.single("file"),
  validate(photoIdSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw errors.validation("Yêu cầu file Excel");
    }

    const photo = await PhotoModel.findById(req.params.id);
    if (!photo) throw errors.notFound("Photo không tồn tại");

    // Check ownership through task
    const task = await TaskModel.findById(photo.taskId);
    if (!task) throw errors.notFound("Photo không tồn tại");

    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Photo không tồn tại hoặc không có quyền");

    try {
      // Read Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Parse and validate annotations
      const annotations = data.map((row: any) => {
        // Required fields
        const x1 = Number(row.x1);
        const y1 = Number(row.y1);
        const x2 = Number(row.x2);
        const y2 = Number(row.y2);

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
          throw errors.validation("Tọa độ không hợp lệ. Cần có x1, y1, x2, y2");
        }

        if (x1 < 0 || x1 > 1 || y1 < 0 || y1 > 1 || x2 < 0 || x2 > 1 || y2 < 0 || y2 > 1) {
          throw errors.validation("Tọa độ phải nằm trong khoảng 0-1");
        }

        // Calculate pixel distance (will be recalculated on client based on image size)
        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

        // Optional fields
        const realValue = row.realValue ? Number(row.realValue) : undefined;
        const unit = row.unit || undefined;
        const realDistance = realValue && unit ? `${realValue}${unit}` : undefined;
        const scale = realValue && distance ? realValue / distance : undefined;

        return {
          x1,
          y1,
          x2,
          y2,
          distance,
          realValue,
          unit,
          realDistance,
          scale,
          name: row.name || undefined,
          category: row.category || undefined,
          notes: row.notes || undefined,
          room: row.room || undefined,
          color: row.color || "#ef4444",
          width: row.width ? Number(row.width) : 2,
          createdAt: Date.now(),
          measuredBy: req.user!.id
        };
      });

      // Update photo with new annotations (append or replace based on query param)
      const mode = req.query.mode || "replace"; // "append" or "replace"
      const existingAnnotations = (photo.annotations || []) as any[];
      if (mode === "append") {
        photo.annotations = existingAnnotations.concat(annotations);
      } else {
        photo.annotations = annotations;
      }

      await photo.save();

      // Clean up temp file
      fs.unlinkSync(req.file.path);

      return sendSuccess(res, {
        photo,
        imported: annotations.length,
        total: (photo.annotations as any[]).length
      });
    } catch (err) {
      // Clean up temp file on error
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw err;
    }
  })
);

export default router;
