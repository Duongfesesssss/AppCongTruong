import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

export const createFloorSchema = z.object({
  body: z.object({
    buildingId: objectIdSchema,
    name: z.string().min(1),
    code: z.string().min(1).max(10).optional(),
    level: z.number().optional()
  })
});

export const listFloorSchema = z.object({
  query: z.object({
    buildingId: objectIdSchema.optional()
  })
});
