import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

export const createDisciplineSchema = z.object({
  body: z.object({
    floorId: objectIdSchema,
    name: z.string().min(1),
    code: z.string().min(1).max(10).optional()
  })
});

export const listDisciplineSchema = z.object({
  query: z.object({
    floorId: objectIdSchema.optional()
  })
});
