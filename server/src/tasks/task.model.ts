import mongoose, { Schema } from "mongoose";

import type { TaskCategory, TaskStatus } from "../lib/constants";

export type TaskDocument = {
  projectId: mongoose.Types.ObjectId;
  buildingId?: mongoose.Types.ObjectId;
  floorId?: mongoose.Types.ObjectId;
  disciplineId?: mongoose.Types.ObjectId;
  drawingId: mongoose.Types.ObjectId;
  pinX: number;
  pinY: number;
  status: TaskStatus;
  category: TaskCategory;
  description?: string;
  roomName?: string;
  pinName?: string;
  gewerk?: string;
  tagNames: string[];
  notes: string[];
  pinCode: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const taskSchema = new Schema<TaskDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", index: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", index: true },
    disciplineId: { type: Schema.Types.ObjectId, ref: "Discipline", index: true },
    drawingId: { type: Schema.Types.ObjectId, ref: "Drawing", required: true, index: true },
    pinX: { type: Number, required: true },
    pinY: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ["instruction", "rfi", "resolved", "approved", "open", "in_progress", "blocked", "done"]
    },
    category: { type: String, required: true, enum: ["quality", "safety", "progress", "fire_protection", "other"] },
    description: { type: String, trim: true },
    roomName: { type: String, trim: true },
    pinName: { type: String, trim: true },
    gewerk: { type: String, trim: true },
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
    notes: { type: [String], default: [] },
    pinCode: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

taskSchema.index({ drawingId: 1, createdAt: -1 });

taskSchema.index({ status: 1 });

taskSchema.index({ category: 1 });
taskSchema.index({ drawingId: 1, tagNames: 1 });
taskSchema.index({ projectId: 1, tagNames: 1 });

export const TaskModel = mongoose.model<TaskDocument>("Task", taskSchema);
