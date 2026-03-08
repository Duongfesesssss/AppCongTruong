import mongoose, { Schema } from "mongoose";

export type DrawingParsedMetadata = {
  projectCode?: string;
  unitCode?: string;
  disciplineCode?: string;
  buildingCode?: string;
  buildingPartCode?: string;
  floorCode?: string;
  fileTypeCode?: string;
};

export type DrawingFileType = "2d" | "3d" | "hybrid";

export type DrawingDocument = {
  projectId: mongoose.Types.ObjectId;
  buildingId?: mongoose.Types.ObjectId;
  floorId?: mongoose.Types.ObjectId;
  disciplineId?: mongoose.Types.ObjectId;
  name: string;
  drawingCode: string;
  versionIndex: number;
  isLatestVersion: boolean;
  parsedMetadata?: DrawingParsedMetadata;
  tagNames: string[];
  sortIndex: number;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  // IFC 3D support fields
  fileType: DrawingFileType; // Loại file: 2d (PDF), 3d (IFC), hybrid (có cả 2)
  linkedDrawingId?: mongoose.Types.ObjectId; // ID của file liên kết (PDF ↔ IFC)
  ifcMetadata?: {
    ifcSchema?: string; // IFC2X3, IFC4, IFC4X3, etc.
    containsBuildingElements?: boolean;
    elementCount?: number;
    validated?: boolean;
    validatedAt?: Date;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const drawingSchema = new Schema<DrawingDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", index: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", index: true },
    disciplineId: { type: Schema.Types.ObjectId, ref: "Discipline", index: true },
    name: { type: String, required: true, trim: true },
    drawingCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    versionIndex: { type: Number, required: true, default: 1, min: 1 },
    isLatestVersion: { type: Boolean, required: true, default: true, index: true },
    parsedMetadata: {
      projectCode: { type: String, uppercase: true, trim: true },
      unitCode: { type: String, uppercase: true, trim: true },
      disciplineCode: { type: String, uppercase: true, trim: true },
      buildingCode: { type: String, uppercase: true, trim: true },
      buildingPartCode: { type: String, uppercase: true, trim: true },
      floorCode: { type: String, uppercase: true, trim: true },
      fileTypeCode: { type: String, uppercase: true, trim: true }
    },
    tagNames: {
      type: [String],
      default: [],
      set: (values: string[]) => {
        const normalized = (values || [])
          .map((value) => String(value).trim().toLowerCase())
          .filter(Boolean);
        return Array.from(new Set(normalized));
      }
    },
    sortIndex: { type: Number, default: 0, index: true },
    originalName: { type: String, required: true },
    storageKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    // IFC 3D support fields
    fileType: {
      type: String,
      enum: ["2d", "3d", "hybrid"],
      required: true,
      default: "2d",
      index: true
    },
    linkedDrawingId: { type: Schema.Types.ObjectId, ref: "Drawing", index: true },
    ifcMetadata: {
      ifcSchema: { type: String, uppercase: true, trim: true },
      containsBuildingElements: { type: Boolean },
      elementCount: { type: Number },
      validated: { type: Boolean },
      validatedAt: { type: Date }
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

drawingSchema.index({ projectId: 1, createdAt: -1 });
drawingSchema.index({ projectId: 1, sortIndex: 1 });
drawingSchema.index({ projectId: 1, drawingCode: 1, versionIndex: -1 });
drawingSchema.index({ projectId: 1, isLatestVersion: 1, sortIndex: 1 });
drawingSchema.index({ projectId: 1, tagNames: 1 });

export const DrawingModel = mongoose.model<DrawingDocument>("Drawing", drawingSchema);
