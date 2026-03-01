import { Types } from "mongoose";

import { NotificationModel, type NotificationType } from "./notification.model";
import { publishToUser, publishToUsers } from "../realtime/hub";

type CreateNotificationInput = {
  recipientUserId: string;
  actorUserId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

const toResponseShape = (doc: any) => ({
  id: doc._id.toString(),
  recipientUserId: doc.recipientUserId.toString(),
  actorUserId: doc.actorUserId ? doc.actorUserId.toString() : undefined,
  type: doc.type,
  title: doc.title,
  message: doc.message,
  data: doc.data,
  readAt: doc.readAt ?? null,
  createdAt: doc.createdAt
});

export const createAndPublishNotifications = async (items: CreateNotificationInput[]) => {
  if (!items.length) return [];

  const docs = await NotificationModel.insertMany(
    items.map((item) => ({
      recipientUserId: new Types.ObjectId(item.recipientUserId),
      actorUserId: item.actorUserId ? new Types.ObjectId(item.actorUserId) : undefined,
      type: item.type,
      title: item.title,
      message: item.message,
      data: item.data
    }))
  );

  docs.forEach((doc) => {
    publishToUser(doc.recipientUserId.toString(), "notification:new", toResponseShape(doc));
  });

  return docs;
};

export const publishNotificationRead = (recipientUserId: string, notificationId: string) => {
  publishToUser(recipientUserId, "notification:read", { id: notificationId, readAt: Date.now() });
};

export const publishNotificationsReadAll = (recipientUserId: string) => {
  publishToUsers([recipientUserId], "notification:read", { all: true, readAt: Date.now() });
};
