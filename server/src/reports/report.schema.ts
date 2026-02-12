import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

export const exportExcelSchema = z.object({
  query: z.object({
    projectId: objectIdSchema.optional(),
    drawingId: objectIdSchema.optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  })
});

export const exportImagesSchema = z.object({
  query: z.object({
    drawingId: objectIdSchema,
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  })
});
