import mongoose, { Schema } from "mongoose";

export type DrawingDocument = {
  projectId: mongoose.Types.ObjectId;
  buildingId: mongoose.Types.ObjectId;
  floorId: mongoose.Types.ObjectId;
  disciplineId: mongoose.Types.ObjectId;
  name: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
};

const drawingSchema = new Schema<DrawingDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true, index: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true, index: true },
    disciplineId: { type: Schema.Types.ObjectId, ref: "Discipline", required: true, index: true },
    name: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    storageKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }
  },
  { timestamps: true }
);

drawingSchema.index({ disciplineId: 1, createdAt: -1 });

export const DrawingModel = mongoose.model<DrawingDocument>("Drawing", drawingSchema);
