import mongoose, { Schema } from "mongoose";

import type { ZoneStatus } from "../lib/constants";

export type ZoneDocument = {
  taskId: mongoose.Types.ObjectId;
  drawingId: mongoose.Types.ObjectId;
  status: ZoneStatus;
  style?: Record<string, unknown>;
  notes: string[];
  shape: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const zoneSchema = new Schema<ZoneDocument>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, unique: true },
    drawingId: { type: Schema.Types.ObjectId, ref: "Drawing", required: true, index: true },
    status: { type: String, required: true, enum: ["open", "in_progress", "done"], default: "open" },
    style: { type: Schema.Types.Mixed },
    notes: { type: [String], default: [] },
    shape: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const ZoneModel = mongoose.model<ZoneDocument>("Zone", zoneSchema);
