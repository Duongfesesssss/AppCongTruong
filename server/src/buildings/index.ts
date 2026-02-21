import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { ProjectModel } from "../projects/project.model";
import { ensureProjectRole } from "../projects/project-access";
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

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "admin", "Project không tồn tại hoặc không có quyền");

    const lastBuilding = await BuildingModel.findOne({ projectId: project!._id })
      .sort({ sortIndex: -1, createdAt: -1 })
      .select("sortIndex")
      .lean();
    const nextSortIndex = (lastBuilding?.sortIndex ?? 0) + 1;

    const building = await BuildingModel.create({
      projectId: project!._id,
      name: sanitizeText(name),
      code: toCode(code ?? name, 3),
      sortIndex: nextSortIndex
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
    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "technician", "Project không tồn tại hoặc không có quyền");

    const buildings = await BuildingModel.find({ projectId }).sort({ sortIndex: 1, createdAt: 1 });
    return sendSuccess(res, buildings);
  })
);

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) throw errors.validation("Tên không được để trống");

    const building = await BuildingModel.findById(req.params.id);
    if (!building) throw errors.notFound("Building không tồn tại");

    ensureProjectRole(
      await ProjectModel.findById(building.projectId),
      req.user!.id,
      "admin",
      "Building không tồn tại hoặc không có quyền"
    );

    building.name = sanitizeText(name);
    building.code = toCode(name, 3);
    await building.save();
    return sendSuccess(res, building);
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const building = await BuildingModel.findById(req.params.id);
    if (!building) throw errors.notFound("Building không tồn tại");

    // Check ownership
    ensureProjectRole(
      await ProjectModel.findById(building.projectId),
      req.user!.id,
      "admin",
      "Building không tồn tại hoặc không có quyền"
    );

    await BuildingModel.deleteOne({ _id: req.params.id });
    return sendSuccess(res, { ok: true });
  })
);

export default router;
