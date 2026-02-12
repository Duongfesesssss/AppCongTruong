import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

export const roomSuggestionSchema = z.object({
  query: z.object({
    drawingId: objectIdSchema,
    q: z.string().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional()
  })
});
