import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

import { Router } from "express";
import imageSize from "image-size";
import * as XLSX from "xlsx";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { createUploader, handleFileUpload } from "../lib/uploads";
import { config } from "../lib/config";
import { uploadLimiter } from "../middlewares/rate-limit";
import { deleteFromS3, getS3Stream } from "../lib/s3";
import { TaskModel } from "../tasks/task.model";
import { ProjectModel } from "../projects/project.model";
import { ensureProjectRole, canDeleteResource } from "../projects/project-access";
import { PhotoModel } from "./photo.model";
import {
  bulkPhotoJobIdSchema,
  createBulkPhotoSchema,
  createPhotoSchema,
  photoIdSchema,
  updatePhotoSchema
} from "./photo.schema";

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

type PhotoMetadataPayload = {
  name?: string;
  description?: string;
  location?: string;
  category?: string;
  measuredBy?: string;
};

type BulkUploadJobStatus = "processing" | "completed" | "completed_with_errors" | "failed";

type BulkUploadJobError = {
  fileName: string;
  message: string;
};

type BulkUploadJob = {
  id: string;
  userId: string;
  taskId: string;
  status: BulkUploadJobStatus;
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  failedCount: number;
  createdPhotoIds: string[];
  errors: BulkUploadJobError[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

const BULK_JOB_TTL_MS = 1000 * 60 * 30;
const bulkUploadJobs = new Map<string, BulkUploadJob>();

const cleanupExpiredBulkJobs = () => {
  const now = Date.now();
  for (const [jobId, job] of bulkUploadJobs.entries()) {
    if (job.expiresAt <= now) {
      bulkUploadJobs.delete(jobId);
    }
  }
};

const trimOptional = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getLocalPhotoPath = (storageKey: string) => {
  const safeKey = path.basename(storageKey);
  const localPath = path.join(process.cwd(), "uploads", "photos", safeKey);
  if (fs.existsSync(localPath)) return localPath;
  return path.join(process.cwd(), "server", "uploads", "photos", safeKey);
};

const isS3KeyNotFoundError = (err: unknown) => {
  const value = err as { name?: string; message?: string };
  const name = value?.name ?? "";
  const message = value?.message ?? "";
  return (
    name === "NoSuchKey" ||
    name === "NotFound" ||
    message.includes("NoSuchKey") ||
    message.includes("NotFound") ||
    message.includes("specified key does not exist")
  );
};

const getPhotoS3StreamWithFallback = async (storageKey: string) => {
  const safeKey = path.basename(storageKey);
  const candidateKeys = storageKey.startsWith("photos/")
    ? [storageKey, safeKey]
    : [storageKey, `photos/${safeKey}`];

  for (const key of candidateKeys) {
    try {
      return await getS3Stream(key);
    } catch (err) {
      if (isS3KeyNotFoundError(err)) {
        continue;
      }
      throw err;
    }
  }

  throw errors.notFound("File khong ton tai");
};

const readImageDimensions = (file: Express.Multer.File) => {
  try {
    const dim = config.storageType === "s3" ? imageSize(file.buffer) : imageSize(file.path);
    return {
      width: dim.width ?? undefined,
      height: dim.height ?? undefined
    };
  } catch {
    return {
      width: undefined,
      height: undefined
    };
  }
};

const loadTaskWithAccess = async (taskId: string, userId: string) => {
  const task = await TaskModel.findById(taskId);
  if (!task) throw errors.notFound("Task khong ton tai");

  ensureProjectRole(
    await ProjectModel.findById(task.projectId),
    userId,
    "technician",
    "Task khong ton tai hoac khong co quyen"
  );

  return task;
};

const createPhotoFromFile = async (
  task: Awaited<ReturnType<typeof loadTaskWithAccess>>,
  file: Express.Multer.File,
  metadata: PhotoMetadataPayload,
  userId: string
) => {
  const dimensions = readImageDimensions(file);
  const storageKey = await handleFileUpload(file, "photos");

  return PhotoModel.create({
    taskId: task._id,
    drawingId: task.drawingId,
    storageKey,
    mimeType: file.mimetype,
    size: file.size,
    width: dimensions.width,
    height: dimensions.height,
    name: trimOptional(metadata.name),
    description: trimOptional(metadata.description),
    location: trimOptional(metadata.location),
    category: trimOptional(metadata.category),
    measuredBy: trimOptional(metadata.measuredBy),
    measuredAt: new Date(),
    createdBy: userId
  });
};

router.post(
  "/",
  requireAuth,
  uploadLimiter,
  upload.single("file"),
  validate(createPhotoSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw errors.validation("Yeu cau file upload");
    }

    const { taskId, name, description, location, category, measuredBy } = req.body as {
      taskId: string;
      name?: string;
      description?: string;
      location?: string;
      category?: string;
      measuredBy?: string;
    };

    const task = await loadTaskWithAccess(taskId, req.user!.id);
    const photo = await createPhotoFromFile(task, req.file, {
      name,
      description,
      location,
      category,
      measuredBy
    }, req.user!.id);

    return sendSuccess(res, photo, {}, 201);
  })
);

router.post(
  "/bulk",
  requireAuth,
  uploadLimiter,
  upload.array("files", 50),
  validate(createBulkPhotoSchema),
  asyncHandler(async (req, res) => {
    cleanupExpiredBulkJobs();

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw errors.validation("Yeu cau it nhat 1 file");
    }

    const { taskId, name, description, location, category, measuredBy } = req.body as {
      taskId: string;
      name?: string;
      description?: string;
      location?: string;
      category?: string;
      measuredBy?: string;
    };

    // Validate access before creating background job.
    await loadTaskWithAccess(taskId, req.user!.id);

    const now = Date.now();
    const jobId = crypto.randomUUID();
    const job: BulkUploadJob = {
      id: jobId,
      userId: req.user!.id,
      taskId,
      status: "processing",
      totalFiles: files.length,
      processedFiles: 0,
      successCount: 0,
      failedCount: 0,
      createdPhotoIds: [],
      errors: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: now + BULK_JOB_TTL_MS
    };

    bulkUploadJobs.set(jobId, job);

    setImmediate(async () => {
      try {
        const task = await loadTaskWithAccess(taskId, req.user!.id);

        for (const [index, file] of files.entries()) {
          try {
            const numberedName =
              name && files.length > 1 ? `${trimOptional(name)} ${index + 1}` : trimOptional(name);
            const photo = await createPhotoFromFile(task, file, {
              name: numberedName,
              description,
              location,
              category,
              measuredBy
            }, req.user!.id);
            job.createdPhotoIds.push(photo._id.toString());
            job.successCount += 1;
          } catch (err) {
            job.failedCount += 1;
            job.errors.push({
              fileName: file.originalname,
              message: (err as Error).message || "Upload failed"
            });
          } finally {
            job.processedFiles += 1;
            job.updatedAt = Date.now();
          }
        }

        if (job.successCount === 0 && job.failedCount > 0) {
          job.status = "failed";
        } else if (job.failedCount > 0) {
          job.status = "completed_with_errors";
        } else {
          job.status = "completed";
        }
      } catch (err) {
        job.status = "failed";
        job.updatedAt = Date.now();
        job.errors.push({
          fileName: "batch",
          message: (err as Error).message || "Bulk upload failed"
        });
      } finally {
        job.expiresAt = Date.now() + BULK_JOB_TTL_MS;
      }
    });

    return sendSuccess(
      res,
      {
        jobId,
        status: job.status,
        totalFiles: job.totalFiles
      },
      {},
      202
    );
  })
);

router.get(
  "/bulk/:jobId",
  requireAuth,
  validate(bulkPhotoJobIdSchema),
  asyncHandler(async (req, res) => {
    cleanupExpiredBulkJobs();

    const job = bulkUploadJobs.get(req.params.jobId);
    if (!job) throw errors.notFound("Khong tim thay job bulk upload");

    if (job.userId !== req.user!.id) {
      throw errors.forbidden("Khong co quyen xem job nay");
    }

    return sendSuccess(res, {
      id: job.id,
      status: job.status,
      taskId: job.taskId,
      totalFiles: job.totalFiles,
      processedFiles: job.processedFiles,
      successCount: job.successCount,
      failedCount: job.failedCount,
      createdPhotoIds: job.createdPhotoIds,
      errors: job.errors
    });
  })
);

router.patch(
  "/:id",
  requireAuth,
  validate(photoIdSchema),
  validate(updatePhotoSchema),
  asyncHandler(async (req, res) => {
    const photo = await PhotoModel.findById(req.params.id);
    if (!photo) throw errors.notFound("Photo khong ton tai");

    // Check ownership through task
    const task = await TaskModel.findById(photo.taskId);
    if (!task) throw errors.notFound("Photo khong ton tai");

    ensureProjectRole(
      await ProjectModel.findById(task.projectId),
      req.user!.id,
      "technician",
      "Photo khong ton tai hoac khong co quyen"
    );

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
    if (!photo) throw errors.notFound("Photo khong ton tai");

    // Check ownership through task
    const task = await TaskModel.findById(photo.taskId);
    if (!task) throw errors.notFound("Photo khong ton tai");

    ensureProjectRole(
      await ProjectModel.findById(task.projectId),
      req.user!.id,
      "technician",
      "Photo khong ton tai hoac khong co quyen"
    );

    // CORS headers cho embedded content
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Content-Type", photo.mimeType);

    if (config.storageType === "s3") {
      // Stream from S3 through server (avoids CORS issues)
      const stream = await getPhotoS3StreamWithFallback(photo.storageKey);
      const safeKey = path.basename(photo.storageKey);
      res.setHeader("Content-Disposition", `inline; filename="${safeKey}"`);
      stream.pipe(res);
    } else {
      // Serve from local filesystem
      const filePath = getLocalPhotoPath(photo.storageKey);
      if (!fs.existsSync(filePath)) throw errors.notFound("File khong ton tai");

      const safeKey = path.basename(photo.storageKey);
      res.setHeader("Content-Disposition", `inline; filename="${safeKey}"`);
      fs.createReadStream(filePath).pipe(res);
    }
  })
);

router.delete(
  "/:id",
  requireAuth,
  validate(photoIdSchema),
  asyncHandler(async (req, res) => {
    const photo = await PhotoModel.findById(req.params.id);
    if (!photo) throw errors.notFound("Photo khong ton tai");

    // Check ownership through task
    const task = await TaskModel.findById(photo.taskId);
    if (!task) throw errors.notFound("Photo khong ton tai");

    // Check delete permission: chỉ admin hoặc người tạo mới được xóa
    const project = await ProjectModel.findById(task.projectId);
    canDeleteResource(project, req.user!.id, photo.createdBy, "Photo khong ton tai hoac khong co quyen");

    // Delete file from storage
    if (config.storageType === "s3") {
      // Delete from S3
      try {
        await deleteFromS3(photo.storageKey);
      } catch (err) {
        // Log error but don't fail the request
        console.error("Failed to delete file from S3:", err);
      }
    } else {
      // Delete from local filesystem
      const filePath = getLocalPhotoPath(photo.storageKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
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
      throw errors.validation("Yeu cau file Excel");
    }

    const photo = await PhotoModel.findById(req.params.id);
    if (!photo) throw errors.notFound("Photo khong ton tai");

    // Check ownership through task
    const task = await TaskModel.findById(photo.taskId);
    if (!task) throw errors.notFound("Photo khong ton tai");

    ensureProjectRole(
      await ProjectModel.findById(task.projectId),
      req.user!.id,
      "technician",
      "Photo khong ton tai hoac khong co quyen"
    );

    try {
      // Read Excel file
      const workbook = req.file.buffer
        ? XLSX.read(req.file.buffer, { type: "buffer" })
        : XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Parse and validate annotations
      const annotations = data.map((row: any, index: number) => {
        // Required fields
        const x1 = Number(row.x1);
        const y1 = Number(row.y1);
        const x2 = Number(row.x2);
        const y2 = Number(row.y2);

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
          throw errors.validation(
            `Hang ${index + 2}: Toa do khong hop le. Can co x1, y1, x2, y2 voi gia tri so. ` +
              `Nhan duoc: x1=${row.x1}, y1=${row.y1}, x2=${row.x2}, y2=${row.y2}`
          );
        }

        if (x1 < 0 || x1 > 1 || y1 < 0 || y1 > 1 || x2 < 0 || x2 > 1 || y2 < 0 || y2 > 1) {
          throw errors.validation(
            `Hang ${index + 2}: Toa do phai nam trong khoang 0-1. ` +
              `Nhan duoc: x1=${x1}, y1=${y1}, x2=${x2}, y2=${y2}`
          );
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
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return sendSuccess(res, {
        photo,
        imported: annotations.length,
        total: (photo.annotations as any[]).length
      });
    } catch (err) {
      // Clean up temp file on error
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw err;
    }
  })
);

export default router;
