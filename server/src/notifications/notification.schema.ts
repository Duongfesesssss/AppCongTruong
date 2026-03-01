import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

export const listNotificationsSchema = z.object({
  query: z.object({
    unreadOnly: z
      .preprocess((value) => {
        if (value === undefined || value === null) return false;
        if (typeof value === "boolean") return value;
        if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
        return false;
      }, z.boolean())
      .optional(),
    limit: z
      .preprocess((value) => {
        if (value === undefined || value === null || value === "") return 50;
        const parsed = Number(value);
        return Number.isNaN(parsed) ? 50 : parsed;
      }, z.number().int().min(1).max(200))
      .optional()
  })
});

export const notificationIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});
