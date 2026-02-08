import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

export const createBuildingSchema = z.object({
  body: z.object({
    projectId: objectIdSchema,
    name: z.string().min(2),
    code: z.string().min(2).max(10).optional()
  })
});

export const listBuildingSchema = z.object({
  query: z.object({
    projectId: objectIdSchema.optional()
  })
});
