import { z } from "zod";

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    code: z.string().min(2).max(10).optional(),
    description: z.string().max(500).optional()
  })
});

export const listProjectSchema = z.object({
  query: z.object({
    q: z.string().optional()
  })
});
