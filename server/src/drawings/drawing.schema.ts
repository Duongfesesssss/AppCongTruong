import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

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

export const createDrawingSchema = z.object({
  body: z.object({
    projectId: objectIdSchema,
    buildingId: objectIdSchema.optional(),
    floorId: objectIdSchema.optional(),
    disciplineId: objectIdSchema.optional(),
    drawingCode: z.string().min(3).max(120).optional(),
    name: z.string().min(1).optional(),
    tagNames: z.preprocess(parseTagNamesInput, z.array(z.string().min(1).max(80)).max(30).optional()),
    ocrText: z.string().max(20000).optional()
  })
});

export const drawingIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const listDrawingSchema = z.object({
  query: z.object({
    projectId: objectIdSchema.optional(),
    tagName: z.string().min(1).max(80).optional(),
    includeVersions: z
      .preprocess((value) => {
        if (value === undefined || value === null) return false;
        if (typeof value === "boolean") return value;
        if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
        return false;
      }, z.boolean())
      .optional()
  })
});
