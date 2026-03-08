import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

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

export const projectIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const addProjectMemberSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    email: z.string().email("Email khong hop le"),
    role: z.literal("technician").optional()
  })
});

export const listProjectMembersSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const removeProjectMemberSchema = z.object({
  params: z.object({
    id: objectIdSchema,
    memberUserId: objectIdSchema
  })
});

const drawingMetaItemSchema = z.object({
  code: z.string().min(1).max(20).transform((v) => v.trim().toUpperCase()),
  name: z.string().max(60).optional()
});

export const updateDrawingMetaConfigSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    buildings: z.array(drawingMetaItemSchema).max(50).default([]),
    levels: z.array(drawingMetaItemSchema).max(50).default([])
  })
});
