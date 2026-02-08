import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { TemplateModel } from "./template.model";
import { createTemplateSchema } from "./template.schema";
import { sanitizeText } from "../lib/utils";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const templates = await TemplateModel.find().sort({ createdAt: -1 });
    return sendSuccess(res, templates);
  })
);

router.post(
  "/",
  requireAuth,
  validate(createTemplateSchema),
  validate(createTemplateSchema),
  asyncHandler(async (req, res) => {
    const { name, category, attributes, color } = req.body as {
      name: string;
      category: "dimension" | "note" | "mark";
      attributes?: Record<string, unknown>;
      color: string;
    };

    const template = await TemplateModel.create({
      name: sanitizeText(name),
      category,
      attributes: attributes ?? {},
      color: sanitizeText(color)
    });

    return sendSuccess(res, template, {}, 201);
  })
);

export default router;
