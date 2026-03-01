import mongoose, { Schema } from "mongoose";

import type { CmsTagScope } from "../lib/constants";

const normalizeCode = (value: string) => {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, "")
    .replace(/^-+|-+$/g, "");
};

export type CmsTagNameDocument = {
  scope: CmsTagScope;
  code: string;
  aliases: string[];
  label: string;
  description?: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

const cmsTagNameSchema = new Schema<CmsTagNameDocument>(
  {
    scope: {
      type: String,
      required: true,
      enum: [
        "project",
        "discipline",
        "originator",
        "building",
        "volume",
        "zone",
        "level",
        "room",
        "content_type",
        "issue_status",
        "file_type",
        "grid_axis",
        "custom"
      ],
      default: "custom"
    },
    code: { type: String, required: true, uppercase: true, trim: true },
    aliases: {
      type: [String],
      default: [],
      set: (values: string[]) => {
        const unique = new Set<string>();
        (values || []).forEach((value) => {
          const normalized = normalizeCode(value);
          if (normalized) unique.add(normalized);
        });
        return Array.from(unique);
      }
    },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, required: true },
    createdBy: { type: String, trim: true },
    updatedBy: { type: String, trim: true }
  },
  { timestamps: true }
);

cmsTagNameSchema.index({ scope: 1, code: 1 }, { unique: true });
cmsTagNameSchema.index({ scope: 1, isActive: 1, createdAt: -1 });
cmsTagNameSchema.index({ code: "text", aliases: "text", label: "text", description: "text" });

export const CmsTagNameModel = mongoose.model<CmsTagNameDocument>("CmsTagName", cmsTagNameSchema);
