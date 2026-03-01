import { z } from "zod";

import { objectIdSchema } from "../lib/validators";
import { taskCategories, taskStatuses } from "../lib/constants";

const pinSchema = z.number().min(0).max(1);
const tagNameSchema = z.string().trim().min(1).max(80);

const parseTagNamesInput = (value: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback comma split
      }
    }
    return trimmed.split(",").map((item) => item.trim());
  }
  return [];
};

export const createOrUpdateTaskSchema = z
  .object({
    body: z
      .object({
        id: objectIdSchema.optional(),
        drawingId: objectIdSchema.optional(),
        pinX: pinSchema.optional(),
        pinY: pinSchema.optional(),
        status: z.enum(taskStatuses).optional(),
        category: z.enum(taskCategories).optional(),
        description: z.string().max(1000).optional(),
        mentionText: z.string().max(500).optional(),
        roomName: z.string().max(200).optional(),
        pinName: z.string().max(200).optional(),
        gewerk: z.string().max(100).optional(),
        tagNames: z.preprocess(parseTagNamesInput, z.array(tagNameSchema).max(30).optional()),
        notes: z.array(z.string().max(300)).optional()
      })
      .superRefine((val, ctx) => {
        if (!val.id) {
          if (!val.drawingId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "drawingId bắt buộc" });
          }
          if (val.pinX === undefined || val.pinY === undefined) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "pinX/pinY bắt buộc" });
          }
          if (!val.status) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "status bắt buộc" });
          }
          if (!val.category) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "category bắt buộc" });
          }
        }
      })
  });

export const taskIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const listTaskSchema = z.object({
  query: z.object({
    projectId: objectIdSchema.optional(),
    drawingId: objectIdSchema.optional(),
    status: z.enum(taskStatuses).optional(),
    category: z.enum(taskCategories).optional(),
    tagName: tagNameSchema.optional(),
    tagNames: z.preprocess(parseTagNamesInput, z.array(tagNameSchema).max(30).optional())
  })
});
