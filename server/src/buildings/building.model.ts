import mongoose, { Schema } from "mongoose";

export type BuildingDocument = {
  projectId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  sortIndex: number;
  createdAt: Date;
  updatedAt: Date;
};

const buildingSchema = new Schema<BuildingDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    sortIndex: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

buildingSchema.index({ projectId: 1, code: 1 });
buildingSchema.index({ projectId: 1, sortIndex: 1 });

export const BuildingModel = mongoose.model<BuildingDocument>("Building", buildingSchema);
