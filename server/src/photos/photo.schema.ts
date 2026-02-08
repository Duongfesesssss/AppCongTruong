import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

export const createPhotoSchema = z.object({
  body: z.object({
    taskId: objectIdSchema,

    // Photo metadata (optional)
    name: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    category: z.enum(["fire_protection", "quality", "safety", "progress", "other"]).optional(),
    measuredBy: z.string().optional()
  })
});

export const photoIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const updatePhotoSchema = z.object({
  body: z.object({
    annotations: z.unknown()
  })
});
