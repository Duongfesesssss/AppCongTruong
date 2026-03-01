import { z } from "zod";

import { objectIdSchema } from "../lib/validators";

const chatScopeSchema = z.enum(["global", "project"]);

export const listChatMessagesSchema = z.object({
  query: z
    .object({
      scope: chatScopeSchema,
      projectId: objectIdSchema.optional(),
      limit: z
        .preprocess((value) => {
          if (value === undefined || value === null || value === "") return 50;
          const parsed = Number(value);
          return Number.isNaN(parsed) ? 50 : parsed;
        }, z.number().int().min(1).max(200))
        .optional(),
      before: z
        .preprocess((value) => {
          if (!value) return undefined;
          const parsed = Number(value);
          return Number.isNaN(parsed) ? undefined : parsed;
        }, z.number().int().positive())
        .optional()
    })
    .superRefine((value, ctx) => {
      if (value.scope === "project" && !value.projectId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "projectId bat buoc voi scope=project"
        });
      }
    })
});

export const listMentionCandidatesSchema = z.object({
  query: z
    .object({
      scope: chatScopeSchema,
      projectId: objectIdSchema.optional()
    })
    .superRefine((value, ctx) => {
      if (value.scope === "project" && !value.projectId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "projectId bat buoc voi scope=project"
        });
      }
    })
});

export const createChatMessageSchema = z.object({
  body: z
    .object({
      scope: chatScopeSchema,
      projectId: objectIdSchema.optional(),
      content: z.string().min(1).max(5000),
      deepLink: z
        .object({
          drawingId: objectIdSchema.optional(),
          taskId: objectIdSchema.optional(),
          pinX: z.number().min(0).max(1).optional(),
          pinY: z.number().min(0).max(1).optional(),
          zoom: z.number().min(0.1).max(30).optional()
        })
        .optional(),
      snapshotDataUrl: z.string().optional()
    })
    .superRefine((value, ctx) => {
      if (value.scope === "project" && !value.projectId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "projectId bat buoc voi scope=project"
        });
      }
    })
});

export const chatMessageIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});
