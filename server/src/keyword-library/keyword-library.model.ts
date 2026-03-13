import mongoose, { Schema } from "mongoose";

export const keywordLibraryFieldTypes = [
  "discipline",
  "building",
  "level",
  "drawingType",
  "originator",
  "buildingPart",
  "volume",
  "status"
] as const;

export type KeywordLibraryFieldType = (typeof keywordLibraryFieldTypes)[number];

export type KeywordLibraryDocument = {
  fieldType: KeywordLibraryFieldType;
  code: string;
  label: string;
  aliases: string[];
  source: "system" | "user";
  addedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const keywordLibrarySchema = new Schema<KeywordLibraryDocument>(
  {
    fieldType: { type: String, enum: keywordLibraryFieldTypes, required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    label: { type: String, required: true, trim: true },
    aliases: [{ type: String, trim: true, uppercase: true }],
    source: { type: String, enum: ["system", "user"], default: "system" },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

// Unique: mỗi (fieldType, code) chỉ được có 1 entry
keywordLibrarySchema.index({ fieldType: 1, code: 1 }, { unique: true });

export const KeywordLibraryModel = mongoose.model<KeywordLibraryDocument>(
  "KeywordLibrary",
  keywordLibrarySchema
);
