import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { ProjectModel } from "./project.model";
import { createProjectSchema, listProjectSchema } from "./project.schema";
import { sanitizeText, toCode } from "../lib/utils";
import { errors } from "../lib/errors";

const router = Router();

router.post(
  "/",
  requireAuth,
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const { name, code, description } = req.body as {
      name: string;
      code?: string;
      description?: string;
    };

    const project = await ProjectModel.create({
      userId: req.user!.id,
      name: sanitizeText(name),
      code: toCode(code ?? name, 3),
      description: description ? sanitizeText(description) : undefined
    });

    return sendSuccess(res, project, {}, 201);
  })
);

router.get(
  "/",
  requireAuth,
  validate(listProjectSchema),
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const filter: Record<string, unknown> = { userId: req.user!.id };
    if (q) filter.name = new RegExp(q, "i");
    const projects = await ProjectModel.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, projects);
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const project = await ProjectModel.findOne({
      _id: req.params.id,
      userId: req.user!.id
    });
    if (!project) throw errors.notFound("Project không tồn tại");
    return sendSuccess(res, project);
  })
);

router.put(
  "/:id",
  requireAuth,
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const { name, code, description } = req.body as {
      name: string;
      code?: string;
      description?: string;
    };

    const project = await ProjectModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      {
        name: sanitizeText(name),
        code: toCode(code ?? name, 3),
        description: description ? sanitizeText(description) : undefined
      },
      { new: true }
    );

    if (!project) throw errors.notFound("Project không tồn tại");
    return sendSuccess(res, project);
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await ProjectModel.deleteOne({
      _id: req.params.id,
      userId: req.user!.id
    });
    if (result.deletedCount === 0) throw errors.notFound("Project không tồn tại");
    return sendSuccess(res, { ok: true });
  })
);

export default router;
