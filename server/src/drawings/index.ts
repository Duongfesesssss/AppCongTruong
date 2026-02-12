import path from "node:path";
import fs from "node:fs";

import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { DisciplineModel } from "../disciplines/discipline.model";
import { FloorModel } from "../floors/floor.model";
import { BuildingModel } from "../buildings/building.model";
import { ProjectModel } from "../projects/project.model";
import { createDrawingSchema, drawingIdSchema, listDrawingSchema } from "./drawing.schema";
import { DrawingModel } from "./drawing.model";
import { createUploader, handleFileUpload } from "../lib/uploads";
import { config } from "../lib/config";
import { uploadLimiter } from "../middlewares/rate-limit";
import { sanitizeText } from "../lib/utils";
import { ZoneModel } from "../zones/zone.model";
import { getS3SignedUrl, deleteFromS3, getS3Stream } from "../lib/s3";

const router = Router();
const upload = createUploader({
  subDir: "drawings",
  allowedMime: ["application/pdf"],
  maxMb: config.uploadMaxPdfMb
});

const getLocalDrawingPath = (storageKey: string) => {
  const safeKey = path.basename(storageKey);
  const localPath = path.join(process.cwd(), "uploads", "drawings", safeKey);
  if (fs.existsSync(localPath)) return localPath;
  return path.join(process.cwd(), "server", "uploads", "drawings", safeKey);
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

const getDrawingS3StreamWithFallback = async (storageKey: string) => {
  const safeKey = path.basename(storageKey);
  const candidateKeys = storageKey.startsWith("drawings/")
    ? [storageKey, safeKey]
    : [storageKey, `drawings/${safeKey}`];

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

  throw errors.notFound("File không tồn tại");
};

router.post(
  "/",
  requireAuth,
  uploadLimiter,
  upload.single("file"),
  validate(createDrawingSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw errors.validation("Yêu cầu file upload");
    }

    const { disciplineId, name } = req.body as { disciplineId: string; name: string };

    const discipline = await DisciplineModel.findById(disciplineId);
    if (!discipline) throw errors.notFound("Discipline không tồn tại");

    const floor = await FloorModel.findById(discipline.floorId);
    if (!floor) throw errors.notFound("Floor không tồn tại");

    const building = await BuildingModel.findById(discipline.buildingId);
    if (!building) throw errors.notFound("Building không tồn tại");

    const project = await ProjectModel.findOne({ _id: discipline.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Project không tồn tại hoặc không có quyền");

    // Handle file upload (S3 or local)
    const storageKey = await handleFileUpload(req.file, "drawings");

    const lastDrawing = await DrawingModel.findOne({ disciplineId: discipline._id })
      .sort({ sortIndex: -1, createdAt: -1 })
      .select("sortIndex")
      .lean();
    const nextSortIndex = (lastDrawing?.sortIndex ?? 0) + 1;

    const drawing = await DrawingModel.create({
      projectId: project._id,
      buildingId: building._id,
      floorId: floor._id,
      disciplineId: discipline._id,
      name: sanitizeText(name),
      sortIndex: nextSortIndex,
      originalName: req.file.originalname,
      storageKey,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    return sendSuccess(res, drawing, {}, 201);
  })
);

router.get(
  "/",
  requireAuth,
  validate(listDrawingSchema),
  asyncHandler(async (req, res) => {
    // Get user's project IDs
    const userProjects = await ProjectModel.find({ userId: req.user!.id }).select("_id");
    const projectIds = userProjects.map((p) => p._id);

    const filter: Record<string, unknown> = { projectId: { $in: projectIds } };
    if (req.query.disciplineId) filter.disciplineId = req.query.disciplineId;

    const drawings = await DrawingModel.find(filter).sort({ sortIndex: 1, createdAt: 1 });
    return sendSuccess(res, drawings);
  })
);

router.get(
  "/:id",
  requireAuth,
  validate(drawingIdSchema),
  asyncHandler(async (req, res) => {
    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: drawing.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Drawing không tồn tại hoặc không có quyền");

    return sendSuccess(res, drawing);
  })
);

router.get(
  "/:id/file",
  requireAuth,
  validate(drawingIdSchema),
  asyncHandler(async (req, res) => {
    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: drawing.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Drawing không tồn tại hoặc không có quyền");

    // CORS headers cho embedded content
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Content-Type", drawing.mimeType);

    const safeName = path.basename(drawing.originalName || drawing.storageKey);
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);

    if (config.storageType === "s3") {
      // Stream from S3 through server (avoids CORS issues)
      const stream = await getDrawingS3StreamWithFallback(drawing.storageKey);
      stream.pipe(res);
    } else {
      // Serve from local filesystem
      const filePath = getLocalDrawingPath(drawing.storageKey);
      if (!fs.existsSync(filePath)) throw errors.notFound("File không tồn tại");

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  })
);

router.get(
  "/:id/zones",
  requireAuth,
  validate(drawingIdSchema),
  asyncHandler(async (req, res) => {
    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: drawing.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Drawing không tồn tại hoặc không có quyền");

    const zones = await ZoneModel.find({ drawingId: req.params.id }).sort({ createdAt: -1 });
    return sendSuccess(res, zones);
  })
);

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) throw errors.validation("Tên không được để trống");

    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing không tồn tại");

    const project = await ProjectModel.findOne({ _id: drawing.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Không có quyền");

    drawing.name = sanitizeText(name);
    await drawing.save();
    return sendSuccess(res, drawing);
  })
);

router.delete(
  "/:id",
  requireAuth,
  validate(drawingIdSchema),
  asyncHandler(async (req, res) => {
    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: drawing.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Drawing không tồn tại hoặc không có quyền");

    // Chỉ xoá file vật lý khi không còn drawing nào khác dùng chung storageKey
    const storageRefCount = await DrawingModel.countDocuments({
      storageKey: drawing.storageKey,
      _id: { $ne: drawing._id }
    });

    if (storageRefCount === 0) {
      if (config.storageType === "s3") {
        // Delete from S3
        try {
          await deleteFromS3(drawing.storageKey);
        } catch (err) {
          // Log error but don't fail the request
          console.error("Failed to delete file from S3:", err);
        }
      } else {
        // Delete from local filesystem
        const filePath = getLocalDrawingPath(drawing.storageKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await DrawingModel.deleteOne({ _id: req.params.id });
    return sendSuccess(res, { ok: true });
  })
);

export default router;
