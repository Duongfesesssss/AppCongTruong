import mongoose, { Schema } from "mongoose";

export type FloorDocument = {
  projectId: mongoose.Types.ObjectId;
  buildingId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  sortIndex: number;
  level?: number;
  createdAt: Date;
  updatedAt: Date;
};

const floorSchema = new Schema<FloorDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    sortIndex: { type: Number, default: 0, index: true },
    level: { type: Number }
  },
  { timestamps: true }
);

floorSchema.index({ buildingId: 1, code: 1 });
floorSchema.index({ buildingId: 1, sortIndex: 1 });

export const FloorModel = mongoose.model<FloorDocument>("Floor", floorSchema);
