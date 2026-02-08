import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { FloorModel } from "../floors/floor.model";
import { BuildingModel } from "../buildings/building.model";
import { ProjectModel } from "../projects/project.model";
import { DisciplineModel } from "./discipline.model";
import { createDisciplineSchema, listDisciplineSchema } from "./discipline.schema";
import { sanitizeText, toCode } from "../lib/utils";

const router = Router();

router.post(
  "/",
  requireAuth,
  validate(createDisciplineSchema),
  asyncHandler(async (req, res) => {
    const { floorId, name, code } = req.body as { floorId: string; name: string; code?: string };

    const floor = await FloorModel.findById(floorId);
    if (!floor) throw errors.notFound("Floor không tồn tại");

    const building = await BuildingModel.findById(floor.buildingId);
    if (!building) throw errors.notFound("Building không tồn tại");

    const project = await ProjectModel.findOne({ _id: floor.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Project không tồn tại hoặc không có quyền");

    const discipline = await DisciplineModel.create({
      projectId: project._id,
      buildingId: building._id,
      floorId: floor._id,
      name: sanitizeText(name),
      code: toCode(code ?? name, 3)
    });

    return sendSuccess(res, discipline, {}, 201);
  })
);

router.get(
  "/",
  requireAuth,
  validate(listDisciplineSchema),
  asyncHandler(async (req, res) => {
    const floorId = req.query.floorId as string | undefined;
    if (!floorId) {
      return sendSuccess(res, []);
    }

    // Verify user owns the project through floor
    const floor = await FloorModel.findById(floorId);
    if (!floor) throw errors.notFound("Floor không tồn tại");

    const project = await ProjectModel.findOne({ _id: floor.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Floor không tồn tại hoặc không có quyền");

    const disciplines = await DisciplineModel.find({ floorId }).sort({ createdAt: -1 });
    return sendSuccess(res, disciplines);
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const discipline = await DisciplineModel.findById(req.params.id);
    if (!discipline) throw errors.notFound("Discipline không tồn tại");

    // Check ownership through floor → project
    const floor = await FloorModel.findById(discipline.floorId);
    if (!floor) throw errors.notFound("Discipline không tồn tại");

    const project = await ProjectModel.findOne({ _id: floor.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Discipline không tồn tại hoặc không có quyền");

    await DisciplineModel.deleteOne({ _id: req.params.id });
    return sendSuccess(res, { ok: true });
  })
);

export default router;
