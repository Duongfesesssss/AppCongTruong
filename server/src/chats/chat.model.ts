import mongoose, { Schema } from "mongoose";

export type ChatScope = "global" | "project" | "dm";

export type ChatDeepLink = {
  drawingId?: string;
  taskId?: string;
  pinX?: number;
  pinY?: number;
  zoom?: number;
};

export type ChatMessageDocument = {
  scope: ChatScope;
  projectId?: mongoose.Types.ObjectId;
  dmParticipants?: mongoose.Types.ObjectId[];
  senderUserId: mongoose.Types.ObjectId;
  senderName: string;
  senderEmail: string;
  content: string;
  mentions: mongoose.Types.ObjectId[];
  deepLink?: ChatDeepLink;
  snapshotStorageKey?: string;
  snapshotMimeType?: string;
  createdAt: Date;
  updatedAt: Date;
};

const chatDeepLinkSchema = new Schema<ChatDeepLink>(
  {
    drawingId: { type: String, trim: true },
    taskId: { type: String, trim: true },
    pinX: { type: Number, min: 0, max: 1 },
    pinY: { type: Number, min: 0, max: 1 },
    zoom: { type: Number, min: 0.1, max: 30 }
  },
  { _id: false }
);

const chatMessageSchema = new Schema<ChatMessageDocument>(
  {
    scope: { type: String, required: true, enum: ["global", "project", "dm"], index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    dmParticipants: { type: [Schema.Types.ObjectId], ref: "User", default: undefined },
    senderUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    senderName: { type: String, required: true, trim: true },
    senderEmail: { type: String, required: true, trim: true, lowercase: true },
    content: { type: String, required: true, trim: true },
    mentions: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    deepLink: { type: chatDeepLinkSchema },
    snapshotStorageKey: { type: String, trim: true },
    snapshotMimeType: { type: String, trim: true }
  },
  { timestamps: true }
);

chatMessageSchema.index({ scope: 1, createdAt: -1 });
chatMessageSchema.index({ projectId: 1, createdAt: -1 });
chatMessageSchema.index({ scope: 1, dmParticipants: 1, createdAt: -1 });

export const ChatMessageModel = mongoose.model<ChatMessageDocument>("ChatMessage", chatMessageSchema);
