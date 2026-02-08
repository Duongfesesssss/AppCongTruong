import { z } from "zod";

import { templateCategories } from "../lib/constants";

export const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    category: z.enum(templateCategories),
    attributes: z.record(z.unknown()).optional(),
    color: z.string().min(3)
  })
});
