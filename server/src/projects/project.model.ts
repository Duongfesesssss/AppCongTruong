import mongoose, { Schema, Types } from "mongoose";

export type ProjectDocument = {
  userId: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
};

const projectSchema = new Schema<ProjectDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true }
  },
  { timestamps: true }
);

// Unique code per user (not globally)
projectSchema.index({ userId: 1, code: 1 }, { unique: true });
projectSchema.index({ userId: 1, name: 1 });

export const ProjectModel = mongoose.model<ProjectDocument>("Project", projectSchema);
