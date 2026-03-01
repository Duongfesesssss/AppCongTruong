import mongoose, { Schema } from "mongoose";

export type NotificationType = "mention" | "task_status_changed" | "system";

export type NotificationDocument = {
  recipientUserId: mongoose.Types.ObjectId;
  actorUserId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const notificationSchema = new Schema<NotificationDocument>(
  {
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, required: true, enum: ["mention", "task_status_changed", "system"] },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed },
    readAt: { type: Date }
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<NotificationDocument>("Notification", notificationSchema);
