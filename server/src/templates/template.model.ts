import mongoose, { Schema } from "mongoose";

import type { TemplateCategory } from "../lib/constants";

export type TemplateDocument = {
  name: string;
  category: TemplateCategory;
  attributes: Record<string, unknown>;
  color: string;
  createdAt: Date;
  updatedAt: Date;
};

const templateSchema = new Schema<TemplateDocument>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ["dimension", "note", "mark"] },
    attributes: { type: Schema.Types.Mixed, default: {} },
    color: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

templateSchema.index({ category: 1 });

export const TemplateModel = mongoose.model<TemplateDocument>("Template", templateSchema);
