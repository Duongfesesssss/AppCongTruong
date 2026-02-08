import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { ProjectModel } from "../projects/project.model";
import { BuildingModel } from "./building.model";
import { createBuildingSchema, listBuildingSchema } from "./building.schema";
import { sanitizeText, toCode } from "../lib/utils";

const router = Router();

router.post(
  "/",
  requireAuth,
  validate(createBuildingSchema),
  asyncHandler(async (req, res) => {
    const { projectId, name, code } = req.body as { projectId: string; name: string; code?: string };

    const project = await ProjectModel.findOne({ _id: projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Project không tồn tại hoặc không có quyền");

    const building = await BuildingModel.create({
      projectId: project._id,
      name: sanitizeText(name),
      code: toCode(code ?? name, 3)
    });

    return sendSuccess(res, building, {}, 201);
  })
);

router.get(
  "/",
  requireAuth,
  validate(listBuildingSchema),
  asyncHandler(async (req, res) => {
    const projectId = req.query.projectId as string | undefined;
    if (!projectId) {
      return sendSuccess(res, []);
    }
    // Verify user owns the project
    const project = await ProjectModel.findOne({ _id: projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Project không tồn tại hoặc không có quyền");

    const buildings = await BuildingModel.find({ projectId }).sort({ createdAt: -1 });
    return sendSuccess(res, buildings);
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const building = await BuildingModel.findById(req.params.id);
    if (!building) throw errors.notFound("Building không tồn tại");

    // Check ownership
    const project = await ProjectModel.findOne({ _id: building.projectId, userId: req.user!.id });
    if (!project) throw errors.notFound("Building không tồn tại hoặc không có quyền");

    await BuildingModel.deleteOne({ _id: req.params.id });
    return sendSuccess(res, { ok: true });
  })
);

export default router;
