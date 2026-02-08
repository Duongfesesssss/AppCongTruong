import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { TaskModel } from "./task.model";
import { CounterModel } from "./counter.model";
import { createOrUpdateTaskSchema, listTaskSchema, taskIdSchema } from "./task.schema";
import { DrawingModel } from "../drawings/drawing.model";
import { ProjectModel } from "../projects/project.model";
import { BuildingModel } from "../buildings/building.model";
import { FloorModel } from "../floors/floor.model";
import { DisciplineModel } from "../disciplines/discipline.model";
import { PhotoModel } from "../photos/photo.model";
import { ZoneModel } from "../zones/zone.model";
import { formatPinCode, sanitizeText, toCode } from "../lib/utils";

const router = Router();

const sanitizeOptional = (value?: string) => (value ? sanitizeText(value) : undefined);
const sanitizeNotes = (notes?: string[]) => notes?.map((note) => sanitizeText(note)) ?? undefined;

router.post(
  "/",
  requireAuth,
  validate(createOrUpdateTaskSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      id?: string;
      drawingId?: string;
      pinX?: number;
      pinY?: number;
      status?: "open" | "in_progress" | "blocked" | "done";
      category?: "quality" | "safety" | "progress" | "fire_protection" | "other";
      description?: string;
      roomName?: string;
      pinName?: string;
      gewerk?: string;
      notes?: string[];
    };

    if (body.id) {
      const task = await TaskModel.findById(body.id);
      if (!task) throw errors.notFound("Task không tồn tại");

      // Check ownership through project
      const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
      if (!project) throw errors.notFound("Task không tồn tại hoặc không có quyền");

      if (body.pinX !== undefined) task.pinX = body.pinX;
      if (body.pinY !== undefined) task.pinY = body.pinY;
      if (body.status) task.status = body.status;
      if (body.category) task.category = body.category;
      if (body.description !== undefined) task.description = sanitizeOptional(body.description);
      if (body.roomName !== undefined) task.roomName = sanitizeOptional(body.roomName);
      if (body.pinName !== undefined) task.pinName = sanitizeOptional(body.pinName);
      if (body.gewerk !== undefined) task.gewerk = sanitizeOptional(body.gewerk);
      if (body.notes) task.notes = sanitizeNotes(body.notes) ?? [];

      await task.save();
      return sendSuccess(res, task);
    }

    const drawingId = body.drawingId as string;
    const drawing = await DrawingModel.findById(drawingId);
    if (!drawing) throw errors.notFound("Drawing không tồn tại");

    // Check ownership through project
    const project = await ProjectModel.findOne({ _id: drawing.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Drawing không tồn tại hoặc không có quyền");

    const building = await BuildingModel.findById(drawing.buildingId);
    const floor = await FloorModel.findById(drawing.floorId);
    const discipline = await DisciplineModel.findById(drawing.disciplineId);

    if (!building || !floor || !discipline) {
      throw errors.notFound("Thiếu dữ liệu liên quan");
    }

    const counter = await CounterModel.findOneAndUpdate(
      { _id: project._id.toString() },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const gewerkCode = toCode(body.gewerk ?? "NA", 2);
    const pinCode = formatPinCode(project.code, building.code, floor.code, gewerkCode, counter.seq);

    const task = await TaskModel.create({
      projectId: project._id,
      buildingId: building._id,
      floorId: floor._id,
      disciplineId: discipline._id,
      drawingId: drawing._id,
      pinX: body.pinX as number,
      pinY: body.pinY as number,
      status: body.status as "open" | "in_progress" | "blocked" | "done",
      category: body.category as "quality" | "safety" | "progress" | "fire_protection" | "other",
      description: sanitizeOptional(body.description),
      roomName: sanitizeOptional(body.roomName),
      pinName: sanitizeOptional(body.pinName),
      gewerk: sanitizeOptional(body.gewerk),
      notes: sanitizeNotes(body.notes) ?? [],
      pinCode
    });

    return sendSuccess(res, task, {}, 201);
  })
);

router.get(
  "/",
  requireAuth,
  validate(listTaskSchema),
  asyncHandler(async (req, res) => {
    // Get user's project IDs first
    const userProjects = await ProjectModel.find({ userId: req.user!.id }).select("_id");
    const projectIds = userProjects.map((p) => p._id);

    const filter: Record<string, unknown> = { projectId: { $in: projectIds } };
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.drawingId) filter.drawingId = req.query.drawingId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    const tasks = await TaskModel.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, tasks);
  })
);

router.get(
  "/:id",
  requireAuth,
  validate(taskIdSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findById(req.params.id);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Task không tồn tại hoặc không có quyền");

    return sendSuccess(res, task);
  })
);

router.get(
  "/:id/hierarchy",
  requireAuth,
  validate(taskIdSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findById(req.params.id);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Task không tồn tại hoặc không có quyền");

    const [building, floor, discipline, drawing] = await Promise.all([
      BuildingModel.findById(task.buildingId),
      FloorModel.findById(task.floorId),
      DisciplineModel.findById(task.disciplineId),
      DrawingModel.findById(task.drawingId)
    ]);

    return sendSuccess(res, { task, project, building, floor, discipline, drawing });
  })
);

router.get(
  "/:id/photos",
  requireAuth,
  validate(taskIdSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findById(req.params.id);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Task không tồn tại hoặc không có quyền");

    const photos = await PhotoModel.find({ taskId: req.params.id }).sort({ createdAt: -1 });
    return sendSuccess(res, photos);
  })
);

router.get(
  "/:id/zone",
  requireAuth,
  validate(taskIdSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findById(req.params.id);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Task không tồn tại hoặc không có quyền");

    const zone = await ZoneModel.findOne({ taskId: req.params.id });
    if (!zone) throw errors.notFound("Zone không tồn tại");
    return sendSuccess(res, zone);
  })
);

// DELETE /api/tasks/:id - Xóa task
router.delete(
  "/:id",
  requireAuth,
  validate(taskIdSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findById(req.params.id);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Task không tồn tại hoặc không có quyền");

    // Delete associated photos and zones
    await Promise.all([
      PhotoModel.deleteMany({ taskId: req.params.id }),
      ZoneModel.deleteMany({ taskId: req.params.id })
    ]);

    // Delete task
    await TaskModel.findByIdAndDelete(req.params.id);

    return sendSuccess(res, { message: "Đã xoá task thành công" });
  })
);

export default router;
