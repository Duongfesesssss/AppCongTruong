import mongoose, { Schema } from "mongoose";

export type PhotoDocument = {
  taskId: mongoose.Types.ObjectId;
  drawingId: mongoose.Types.ObjectId;
  storageKey: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  annotations?: unknown;

  // Photo metadata
  name?: string;                // Tên ảnh (vd: "Ảnh van chống cháy số 1")
  description?: string;         // Mô tả (vd: "Chụp từ góc phía bắc")
  location?: string;            // Phòng/Khu vực (vd: "Phòng kỹ thuật, tầng 5")
  category?: string;            // Category (fire_protection, quality, safety, progress, other)

  // Measurement metadata
  measuredBy?: string;          // Người đo (userId hoặc tên)
  measuredAt?: Date;            // Thời điểm đo (lấy từ line mới nhất hoặc khi upload)
  measurementCount?: number;    // Số đường đo (tự động count từ annotations)

  createdAt: Date;
  updatedAt: Date;
};

const photoSchema = new Schema<PhotoDocument>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    drawingId: { type: Schema.Types.ObjectId, ref: "Drawing", required: true, index: true },
    storageKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    annotations: { type: Schema.Types.Mixed },

    // Photo metadata
    name: { type: String },
    description: { type: String },
    location: { type: String },
    category: { type: String },

    // Measurement metadata
    measuredBy: { type: String },
    measuredAt: { type: Date },
    measurementCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

photoSchema.index({ taskId: 1, createdAt: -1 });

export const PhotoModel = mongoose.model<PhotoDocument>("Photo", photoSchema);
