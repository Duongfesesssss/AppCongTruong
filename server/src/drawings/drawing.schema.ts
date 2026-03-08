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

const parseParsedMetadataInput = (value: unknown): Record<string, string> | undefined => {
  if (!value) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, string>;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string>;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const parsedMetadataSchema = z.object({
  projectCode: z.string().max(40).optional(),
  buildingCode: z.string().max(40).optional(),
  levelCode: z.string().max(40).optional(),
  disciplineCode: z.string().max(40).optional(),
  drawingTypeCode: z.string().max(40).optional(),
  numberCode: z.string().max(40).optional(),
  freeText: z.string().max(100).optional()
}).optional();

export const createDrawingSchema = z.object({
  body: z.object({
    projectId: objectIdSchema,
    buildingId: objectIdSchema.optional(),
    floorId: objectIdSchema.optional(),
    disciplineId: objectIdSchema.optional(),
    drawingCode: z.string().min(1).max(120).optional(),
    name: z.string().min(1).optional(),
    tagNames: z.preprocess(parseTagNamesInput, z.array(z.string().min(1).max(80)).max(30).optional()),
    ocrText: z.string().max(20000).optional(),
    fileType: z.enum(["2d", "3d", "hybrid"]).optional(),
    linkedDrawingId: objectIdSchema.optional(),
    parsedMetadata: z.preprocess(parseParsedMetadataInput, parsedMetadataSchema)
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

export const linkDrawingsSchema = z.object({
  body: z.object({
    drawing2dId: objectIdSchema,
    drawing3dId: objectIdSchema
  })
});

export const unlinkDrawingSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});
