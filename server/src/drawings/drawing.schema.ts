import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

export const createDrawingSchema = z.object({
  body: z.object({
    disciplineId: objectIdSchema,
    name: z.string().min(1)
  })
});

export const drawingIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const listDrawingSchema = z.object({
  query: z.object({
    disciplineId: objectIdSchema.optional()
  })
});
