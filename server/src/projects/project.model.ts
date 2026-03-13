import mongoose, { Schema, Types } from "mongoose";
import type { PermissionKey, ProjectRole } from "../permissions/permission-constants";

// Legacy roles - keeping for backward compatibility
export const projectMemberRoles = ["admin", "technician"] as const;
export type ProjectMemberRole = (typeof projectMemberRoles)[number];

export type ProjectMember = {
  userId: Types.ObjectId;
  role: ProjectMemberRole | ProjectRole; // Support both legacy and new roles
  addedBy?: Types.ObjectId;
  addedAt: Date;
};

// Permission matrix type
export type PermissionMatrix = {
  roles: Record<string, Record<string, boolean>>; // role -> permission -> boolean
};

// Permission change audit log entry
export type PermissionChangeLog = {
  changedBy: Types.ObjectId;
  changedAt: Date;
  role?: string;
  permission?: string;
  oldValue?: boolean;
  newValue?: boolean;
  action: "matrix_updated" | "matrix_reset";
  changes?: Array<{
    role: string;
    permission: string;
    oldValue: boolean;
    newValue: boolean;
  }>;
};

export type DrawingMetaConfigItem = {
  code: string;
  name?: string;
};

export type ProjectDrawingMetaConfig = {
  buildings: DrawingMetaConfigItem[];
  levels: DrawingMetaConfigItem[];
};

export type ProjectDocument = {
  userId: Types.ObjectId;
  members: ProjectMember[];
  name: string;
  code: string;
  sortIndex: number;
  description?: string;
  drawingMetaConfig?: ProjectDrawingMetaConfig;
  permissionMatrix?: PermissionMatrix;
  permissionChangeLogs?: PermissionChangeLog[];
  createdAt: Date;
  updatedAt: Date;
};

const projectMemberSchema = new Schema<ProjectMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true, default: "technician" }, // Allow any string for new roles
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const permissionChangeLogSchema = new Schema<PermissionChangeLog>(
  {
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changedAt: { type: Date, default: Date.now, required: true },
    role: { type: String },
    permission: { type: String },
    oldValue: { type: Boolean },
    newValue: { type: Boolean },
    action: { type: String, enum: ["matrix_updated", "matrix_reset"], required: true },
    changes: [
      {
        role: { type: String, required: true },
        permission: { type: String, required: true },
        oldValue: { type: Boolean, required: true },
        newValue: { type: Boolean, required: true },
        _id: false
      }
    ]
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
    description: { type: String, trim: true },
    drawingMetaConfig: {
      buildings: [{ code: { type: String, uppercase: true, trim: true }, name: { type: String, trim: true }, _id: false }],
      levels: [{ code: { type: String, uppercase: true, trim: true }, name: { type: String, trim: true }, _id: false }]
    },
    permissionMatrix: {
      roles: { type: Schema.Types.Mixed, default: {} }
    },
    permissionChangeLogs: { type: [permissionChangeLogSchema], default: [] }
  },
  { timestamps: true }
);

// Unique code per user (not globally)
projectSchema.index({ userId: 1, code: 1 }, { unique: true });
projectSchema.index({ userId: 1, name: 1 });
projectSchema.index({ userId: 1, sortIndex: 1 });
projectSchema.index({ "members.userId": 1 });

export const ProjectModel = mongoose.model<ProjectDocument>("Project", projectSchema);
