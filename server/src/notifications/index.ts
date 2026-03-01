import { Router } from "express";

import { requireAuth } from "../middlewares/require-auth";
import { validate } from "../middlewares/validation";
import { asyncHandler, sendSuccess } from "../lib/response";
import { NotificationModel } from "./notification.model";
import { listNotificationsSchema, notificationIdSchema } from "./notification.schema";
import { errors } from "../lib/errors";
import { publishNotificationRead, publishNotificationsReadAll } from "./service";

const router = Router();

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

router.get(
  "/",
  requireAuth,
  validate(listNotificationsSchema),
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unreadOnly as boolean | undefined;
    const limit = (req.query.limit as number | undefined) ?? 50;

    const filter: Record<string, unknown> = { recipientUserId: req.user!.id };
    if (unreadOnly) {
      filter.readAt = { $exists: false };
    }

    const notifications = await NotificationModel.find(filter).sort({ createdAt: -1 }).limit(limit);
    return sendSuccess(
      res,
      notifications.map((item) => toResponseShape(item))
    );
  })
);

router.patch(
  "/:id/read",
  requireAuth,
  validate(notificationIdSchema),
  asyncHandler(async (req, res) => {
    const notification = await NotificationModel.findById(req.params.id);
    if (!notification) throw errors.notFound("Thong bao khong ton tai");
    if (notification.recipientUserId.toString() !== req.user!.id) {
      throw errors.forbidden("Khong co quyen cap nhat thong bao nay");
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
      publishNotificationRead(req.user!.id, notification._id.toString());
    }

    return sendSuccess(res, toResponseShape(notification));
  })
);

router.post(
  "/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const now = new Date();
    await NotificationModel.updateMany(
      {
        recipientUserId: req.user!.id,
        readAt: { $exists: false }
      },
      { $set: { readAt: now } }
    );

    publishNotificationsReadAll(req.user!.id);
    return sendSuccess(res, { ok: true, readAt: now });
  })
);

export default router;
