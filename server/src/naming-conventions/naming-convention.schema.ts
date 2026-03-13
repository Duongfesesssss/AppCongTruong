import { z } from "zod";
import { namingFieldTypes } from "./naming-convention.model";
import { objectIdSchema } from "../lib/validators";

export const keywordMappingSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(50),
  label: z.string().trim().min(1).max(200),
  aliases: z.array(z.string().trim().toUpperCase().min(1).max(50)).optional()
});

export const namingFieldSchema = z.object({
  type: z.enum(namingFieldTypes),
  order: z.number().int().min(0).max(20),
  enabled: z.boolean(),
  required: z.boolean(),
  keywords: z.array(keywordMappingSchema).default([])
});

export const createNamingConventionSchema = z.object({
  body: z.object({
    projectId: objectIdSchema,
    separator: z.string().trim().min(1).max(5).default("-"),
    fields: z.array(namingFieldSchema).min(1)
  })
});

export const updateNamingConventionSchema = z.object({
  params: z.object({
    projectId: objectIdSchema
  }),
  body: z.object({
    separator: z.string().trim().min(1).max(5).optional(),
    fields: z.array(namingFieldSchema).min(1).optional()
  })
});

export const getNamingConventionSchema = z.object({
  params: z.object({
    projectId: objectIdSchema
  })
});

export const deleteNamingConventionSchema = z.object({
  params: z.object({
    projectId: objectIdSchema
  })
});

// Schema for validating a filename against naming convention
export const validateFilenameSchema = z.object({
  params: z.object({
    projectId: objectIdSchema
  }),
  body: z.object({
    filename: z.string().trim().min(1)
  })
});
