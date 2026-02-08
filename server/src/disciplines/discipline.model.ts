import mongoose, { Schema } from "mongoose";

export type DisciplineDocument = {
  projectId: mongoose.Types.ObjectId;
  buildingId: mongoose.Types.ObjectId;
  floorId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
};

const disciplineSchema = new Schema<DisciplineDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true, index: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true }
  },
  { timestamps: true }
);

disciplineSchema.index({ floorId: 1, code: 1 });

export const DisciplineModel = mongoose.model<DisciplineDocument>("Discipline", disciplineSchema);
