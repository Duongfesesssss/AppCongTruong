import mongoose, { Schema, Types } from "mongoose";

// Legacy fixed types kept for backward compat
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

// Predefined tag scopes từ CMS (dùng làm gợi ý khi assign tag)
export const predefinedTagScopes = [
  "project",
  "originator",
  "discipline",
  "building",
  "volume",
  "zone",
  "level",
  "room",
  "content_type",
  "file_type",
  "grid_axis",
  "runningNumber",
  "description",
  "custom"
] as const;

export type KeywordMapping = {
  code: string;
  label: string;
  aliases?: string[];
};

export type NamingField = {
  type: string;        // Bất kỳ string nào (scope từ CMS hoặc custom label người dùng tự đặt)
  label?: string;      // Tên hiển thị của trường (optional, default "")
  order: number;
  enabled: boolean;
  required: boolean;
  keywords: KeywordMapping[];
};

export type NamingConventionDocument = {
  projectId: Types.ObjectId;
  separator: string;
  fields: NamingField[];
  exampleFilename?: string;
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
    type: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true, default: "" },
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
    exampleFilename: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const NamingConventionModel = mongoose.model<NamingConventionDocument>(
  "NamingConvention",
  namingConventionSchema
);
