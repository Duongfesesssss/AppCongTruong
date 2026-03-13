import mongoose, { Schema, Types } from "mongoose";

export const namingFieldTypes = [
  "projectPrefix",
  "building",
  "level",
  "discipline",
  "drawingType",
  "runningNumber",
  "description"
] as const;

export type NamingFieldType = (typeof namingFieldTypes)[number];

export type KeywordMapping = {
  code: string;
  label: string;
  aliases?: string[];
};

export type NamingField = {
  type: NamingFieldType;
  order: number;
  enabled: boolean;
  required: boolean;
  keywords: KeywordMapping[];
};

export type NamingConventionDocument = {
  projectId: Types.ObjectId;
  separator: string;
  fields: NamingField[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const keywordMappingSchema = new Schema<KeywordMapping>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    label: { type: String, required: true, trim: true },
    aliases: [{ type: String, uppercase: true, trim: true }]
  },
  { _id: false }
);

const namingFieldSchema = new Schema<NamingField>(
  {
    type: { type: String, enum: namingFieldTypes, required: true },
    order: { type: Number, required: true, min: 0 },
    enabled: { type: Boolean, required: true, default: true },
    required: { type: Boolean, required: true, default: false },
    keywords: { type: [keywordMappingSchema], default: [] }
  },
  { _id: false }
);

const namingConventionSchema = new Schema<NamingConventionDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, unique: true, index: true },
    separator: { type: String, required: true, default: "-", trim: true },
    fields: { type: [namingFieldSchema], required: true, default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

// Đảm bảo mỗi project chỉ có 1 naming convention config
namingConventionSchema.index({ projectId: 1 }, { unique: true });

export const NamingConventionModel = mongoose.model<NamingConventionDocument>(
  "NamingConvention",
  namingConventionSchema
);
