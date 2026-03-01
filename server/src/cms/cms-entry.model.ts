import mongoose, { Schema } from "mongoose";

import type { CmsEntryStatus } from "../lib/constants";

const normalizeTagName = (value: string) => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export type CmsEntryDocument = {
  title: string;
  content: string;
  tagNames: string[];
  status: CmsEntryStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

const cmsEntrySchema = new Schema<CmsEntryDocument>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    tagNames: {
      type: [String],
      default: [],
      set: (values: string[]) => {
        const unique = new Set<string>();
        (values || []).forEach((value) => {
          const normalized = normalizeTagName(value);
          if (normalized) unique.add(normalized);
        });
        return Array.from(unique);
      }
    },
    status: { type: String, required: true, enum: ["draft", "published"], default: "draft" },
    createdBy: { type: String, trim: true },
    updatedBy: { type: String, trim: true }
  },
  { timestamps: true }
);

cmsEntrySchema.index({ status: 1, createdAt: -1 });
cmsEntrySchema.index({ tagNames: 1, createdAt: -1 });
cmsEntrySchema.index({ title: "text", content: "text" });

export const CmsEntryModel = mongoose.model<CmsEntryDocument>("CmsEntry", cmsEntrySchema);
