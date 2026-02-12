import mongoose, { Schema } from "mongoose";

export type RoomDocument = {
  projectId: mongoose.Types.ObjectId;
  buildingId: mongoose.Types.ObjectId;
  floorId: mongoose.Types.ObjectId;
  drawingId?: mongoose.Types.ObjectId;
  roomCode?: string;
  roomName: string;
  normalizedName: string;
  createdAt: Date;
  updatedAt: Date;
};

const roomSchema = new Schema<RoomDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true, index: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true, index: true },
    drawingId: { type: Schema.Types.ObjectId, ref: "Drawing", index: true },
    roomCode: { type: String, trim: true },
    roomName: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, index: true }
  },
  { timestamps: true }
);

roomSchema.index({ projectId: 1, buildingId: 1, floorId: 1, normalizedName: 1 });
roomSchema.index({ projectId: 1, buildingId: 1, floorId: 1, roomCode: 1 });

export const RoomModel = mongoose.model<RoomDocument>("Room", roomSchema);
