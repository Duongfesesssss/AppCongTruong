import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { BuildingModel } from "../buildings/building.model";
import { ProjectModel } from "../projects/project.model";
import { FloorModel } from "./floor.model";
import { createFloorSchema, listFloorSchema } from "./floor.schema";
import { sanitizeText, toCode } from "../lib/utils";

const router = Router();

router.post(
  "/",
  requireAuth,
  validate(createFloorSchema),
  asyncHandler(async (req, res) => {
    const { buildingId, name, code, level } = req.body as {
      buildingId: string;
      name: string;
      code?: string;
      level?: number;
    };

    const building = await BuildingModel.findById(buildingId);
    if (!building) throw errors.notFound("Building không tồn tại");

    const project = await ProjectModel.findOne({ _id: building.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Project không tồn tại hoặc không có quyền");

    const floor = await FloorModel.create({
      projectId: project._id,
      buildingId: building._id,
      name: sanitizeText(name),
      code: toCode(code ?? name, 3),
      level
    });

    return sendSuccess(res, floor, {}, 201);
  })
);

router.get(
  "/",
  requireAuth,
  validate(listFloorSchema),
  asyncHandler(async (req, res) => {
    const buildingId = req.query.buildingId as string | undefined;
    if (!buildingId) {
      return sendSuccess(res, []);
    }

    // Verify user owns the project through building
    const building = await BuildingModel.findById(buildingId);
    if (!building) throw errors.notFound("Building không tồn tại");

    const project = await ProjectModel.findOne({ _id: building.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Building không tồn tại hoặc không có quyền");

    const floors = await FloorModel.find({ buildingId }).sort({ createdAt: -1 });
    return sendSuccess(res, floors);
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const floor = await FloorModel.findById(req.params.id);
    if (!floor) throw errors.notFound("Floor không tồn tại");

    // Check ownership through building → project
    const building = await BuildingModel.findById(floor.buildingId);
    if (!building) throw errors.notFound("Floor không tồn tại");

    const project = await ProjectModel.findOne({ _id: building.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Floor không tồn tại hoặc không có quyền");

    await FloorModel.deleteOne({ _id: req.params.id });
    return sendSuccess(res, { ok: true });
  })
);

export default router;
