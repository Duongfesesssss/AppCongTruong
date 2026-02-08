import { z } from "zod";

import { objectIdSchema } from "../lib/validators";
import { zoneStatuses } from "../lib/constants";

export const createZoneSchema = z.object({
  body: z.object({
    taskId: objectIdSchema,
    shape: z.record(z.unknown()),
    style: z.record(z.unknown()).optional(),
    status: z.enum(zoneStatuses).optional(),
    notes: z.array(z.string().max(300)).optional()
  })
});

export const zoneIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const updateZoneSchema = z.object({
  body: z.object({
    shape: z.record(z.unknown()).optional(),
    style: z.record(z.unknown()).optional(),
    status: z.enum(zoneStatuses).optional(),
    notes: z.array(z.string().max(300)).optional()
  })
});
