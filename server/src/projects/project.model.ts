import mongoose, { Schema, Types } from "mongoose";

export const projectMemberRoles = ["admin", "technician"] as const;
export type ProjectMemberRole = (typeof projectMemberRoles)[number];

export type ProjectMember = {
  userId: Types.ObjectId;
  role: ProjectMemberRole;
  addedBy?: Types.ObjectId;
  addedAt: Date;
};

export type ProjectDocument = {
  userId: Types.ObjectId;
  members: ProjectMember[];
  name: string;
  code: string;
  sortIndex: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
};

const projectMemberSchema = new Schema<ProjectMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: projectMemberRoles, required: true, default: "technician" },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const projectSchema = new Schema<ProjectDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: { type: [projectMemberSchema], default: [] },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    sortIndex: { type: Number, default: 0, index: true },
    description: { type: String, trim: true }
  },
  { timestamps: true }
);

// Unique code per user (not globally)
projectSchema.index({ userId: 1, code: 1 }, { unique: true });
projectSchema.index({ userId: 1, name: 1 });
projectSchema.index({ userId: 1, sortIndex: 1 });
projectSchema.index({ "members.userId": 1 });

export const ProjectModel = mongoose.model<ProjectDocument>("Project", projectSchema);
