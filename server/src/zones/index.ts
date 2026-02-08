import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { TaskModel } from "../tasks/task.model";
import { ProjectModel } from "../projects/project.model";
import { ZoneModel } from "./zone.model";
import { createZoneSchema, updateZoneSchema, zoneIdSchema } from "./zone.schema";
import { sanitizeText } from "../lib/utils";

const router = Router();

const sanitizeNotes = (notes?: string[]) => notes?.map((note) => sanitizeText(note)) ?? undefined;

router.post(
  "/",
  requireAuth,
  validate(createZoneSchema),
  asyncHandler(async (req, res) => {
    const { taskId, shape, style, status, notes } = req.body as {
      taskId: string;
      shape: Record<string, unknown>;
      style?: Record<string, unknown>;
      status?: "open" | "in_progress" | "done";
      notes?: string[];
    };

    const task = await TaskModel.findById(taskId);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Task không tồn tại hoặc không có quyền");

    const exists = await ZoneModel.findOne({ taskId: task._id });
    if (exists) throw errors.conflict("Task đã có zone");

    const zone = await ZoneModel.create({
      taskId: task._id,
      drawingId: task.drawingId,
      shape,
      style,
      status: status ?? "open",
      notes: sanitizeNotes(notes) ?? []
    });

    return sendSuccess(res, zone, {}, 201);
  })
);

router.put(
  "/:id",
  requireAuth,
  validate(zoneIdSchema),
  validate(updateZoneSchema),
  asyncHandler(async (req, res) => {
    const zone = await ZoneModel.findById(req.params.id);
    if (!zone) throw errors.notFound("Zone không tồn tại");

    // Check ownership through task
    const task = await TaskModel.findById(zone.taskId);
    if (!task) throw errors.notFound("Zone không tồn tại");

    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Zone không tồn tại hoặc không có quyền");

    const { shape, style, status, notes } = req.body as {
      shape?: Record<string, unknown>;
      style?: Record<string, unknown>;
      status?: "open" | "in_progress" | "done";
      notes?: string[];
    };

    if (shape) zone.shape = shape;
    if (style) zone.style = style;
    if (status) zone.status = status;
    if (notes) zone.notes = sanitizeNotes(notes) ?? [];

    await zone.save();

    return sendSuccess(res, zone);
  })
);

router.delete(
  "/:id",
  requireAuth,
  validate(zoneIdSchema),
  asyncHandler(async (req, res) => {
    const zone = await ZoneModel.findById(req.params.id);
    if (!zone) throw errors.notFound("Zone không tồn tại");

    // Check ownership through task
    const task = await TaskModel.findById(zone.taskId);
    if (!task) throw errors.notFound("Zone không tồn tại");

    const project = await ProjectModel.findOne({ _id: task.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Zone không tồn tại hoặc không có quyền");

    await zone.deleteOne();
    return sendSuccess(res, { ok: true });
  })
);

export default router;
