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
import { createUploader } from "../lib/uploads";
import { config } from "../lib/config";
import { uploadLimiter } from "../middlewares/rate-limit";
import { sanitizeText } from "../lib/utils";
import { ZoneModel } from "../zones/zone.model";

const router = Router();
const upload = createUploader({
  subDir: "drawings",
  allowedMime: ["application/pdf"],
  maxMb: config.uploadMaxPdfMb
});

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

    const drawing = await DrawingModel.create({
      projectId: project._id,
      buildingId: building._id,
      floorId: floor._id,
      disciplineId: discipline._id,
      name: sanitizeText(name),
      originalName: req.file.originalname,
      storageKey: req.file.filename,
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

    const drawings = await DrawingModel.find(filter).sort({ createdAt: -1 });
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

    const safeKey = path.basename(drawing.storageKey);
    const filePath = path.join(process.cwd(), "uploads", "drawings", safeKey);
    if (!fs.existsSync(filePath)) throw errors.notFound("File không tồn tại");

    // CORS headers cho embedded content
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Content-Type", drawing.mimeType);
    const safeName = path.basename(drawing.originalName || safeKey);
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
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

    // Delete file from disk
    const safeKey = path.basename(drawing.storageKey);
    const filePath = path.join(process.cwd(), "uploads", "drawings", safeKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await DrawingModel.deleteOne({ _id: req.params.id });
    return sendSuccess(res, { ok: true });
  })
);

export default router;
