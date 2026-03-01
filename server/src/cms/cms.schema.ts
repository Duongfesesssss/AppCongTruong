import { z } from "zod";

import { cmsEntryStatuses, cmsTagScopes } from "../lib/constants";
import { objectIdSchema } from "../lib/validators";

const parseStringArrayInput = (value: unknown) => {
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
        // fallback split
      }
    }
    return trimmed.split(",").map((item) => item.trim());
  }
  return [];
};

const tagTokenSchema = z.string().trim().min(1).max(80);
const codeTokenSchema = z.string().trim().min(1).max(80);

export const listCmsTagNameSchema = z.object({
  query: z.object({
    q: z.string().trim().max(120).optional(),
    scope: z.enum(cmsTagScopes).optional(),
    active: z
      .preprocess((value) => {
        if (value === undefined || value === null) return undefined;
        if (typeof value === "boolean") return value;
        if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
        return undefined;
      }, z.boolean().optional())
      .optional()
  })
});

export const createCmsTagNameSchema = z.object({
  body: z.object({
    scope: z.enum(cmsTagScopes).optional(),
    code: codeTokenSchema,
    aliases: z.preprocess(parseStringArrayInput, z.array(codeTokenSchema).max(20).optional()),
    label: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional()
  })
});

const updateCmsTagNameBodySchema = z
  .object({
    scope: z.enum(cmsTagScopes).optional(),
    code: codeTokenSchema.optional(),
    aliases: z.preprocess(parseStringArrayInput, z.array(codeTokenSchema).max(20).optional()),
    label: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Khong co du lieu cap nhat"
  });

export const updateCmsTagNameSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: updateCmsTagNameBodySchema
});

export const cmsTagNameIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const listCmsEntrySchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),
    status: z.enum(cmsEntryStatuses).optional(),
    tagName: z.string().trim().max(80).optional(),
    page: z
      .preprocess((value) => {
        if (value === undefined || value === null || value === "") return 1;
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : 1;
      }, z.number().int().min(1))
      .optional(),
    limit: z
      .preprocess((value) => {
        if (value === undefined || value === null || value === "") return 20;
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : 20;
      }, z.number().int().min(1).max(100))
      .optional()
  })
});

export const createCmsEntrySchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(10000),
    status: z.enum(cmsEntryStatuses).optional(),
    tagNames: z.preprocess(parseStringArrayInput, z.array(tagTokenSchema).max(30).optional())
  })
});

const updateCmsEntryBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(1).max(10000).optional(),
    status: z.enum(cmsEntryStatuses).optional(),
    tagNames: z.preprocess(parseStringArrayInput, z.array(tagTokenSchema).max(30).optional())
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Khong co du lieu cap nhat"
  });

export const updateCmsEntrySchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: updateCmsEntryBodySchema
});

export const cmsEntryIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});
