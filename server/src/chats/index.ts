import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Router } from "express";

import { requireAuth } from "../middlewares/require-auth";
import { validate } from "../middlewares/validation";
import { asyncHandler, sendSuccess } from "../lib/response";
import { errors } from "../lib/errors";
import { sanitizeText } from "../lib/utils";
import { config } from "../lib/config";
import { uploadToS3, getS3Stream } from "../lib/s3";
import { ProjectModel } from "../projects/project.model";
import { ensureProjectRole } from "../projects/project-access";
import { UserModel } from "../users/user.model";
import { publishToUsers } from "../realtime/hub";
import { createAndPublishNotifications } from "../notifications/service";
import { sendMentionEmail } from "../lib/mail";
import { ChatMessageModel, type ChatDeepLink, type ChatScope } from "./chat.model";
import {
  chatMessageIdSchema,
  createChatMessageSchema,
  listChatMessagesSchema,
  listMentionCandidatesSchema
} from "./chat.schema";

const router = Router();
const SNAPSHOT_MAX_BYTES = 3 * 1024 * 1024;

const mentionRegex = /@([a-zA-Z0-9._-]{2,64})/g;

const stripDiacritics = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normalizeMentionValue = (value: string) => stripDiacritics(value).toLowerCase().replace(/\s+/g, "");

const buildSnapshotStorageKey = (mimeType: string) => {
  const extensionByMime: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp"
  };
  const extension = extensionByMime[mimeType] ?? "jpg";
  return `chat-snapshots/${crypto.randomUUID()}.${extension}`;
};

const decodeSnapshotDataUrl = (dataUrl: string) => {
  const matched = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!matched) {
    throw errors.validation("snapshotDataUrl khong hop le");
  }

  const mimeType = matched[1];
  const buffer = Buffer.from(matched[2], "base64");
  if (buffer.length > SNAPSHOT_MAX_BYTES) {
    throw errors.validation("Anh snapshot vuot qua gioi han 3MB");
  }

  return { mimeType, buffer };
};

const saveSnapshot = async (dataUrl?: string) => {
  if (!dataUrl) return null;
  const decoded = decodeSnapshotDataUrl(dataUrl);
  const storageKey = buildSnapshotStorageKey(decoded.mimeType);

  if (config.storageType === "s3") {
    await uploadToS3(storageKey, decoded.buffer, decoded.mimeType);
  } else {
    const snapshotsDir = path.join(process.cwd(), "uploads", "chat-snapshots");
    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    }
    const fullPath = path.join(snapshotsDir, path.basename(storageKey));
    fs.writeFileSync(fullPath, decoded.buffer);
  }

  return {
    storageKey,
    mimeType: decoded.mimeType
  };
};

const getSnapshotLocalPath = (storageKey: string) => {
  const safeKey = path.basename(storageKey);
  const localPath = path.join(process.cwd(), "uploads", "chat-snapshots", safeKey);
  if (fs.existsSync(localPath)) return localPath;
  return path.join(process.cwd(), "server", "uploads", "chat-snapshots", safeKey);
};

const extractMentionTokens = (content: string) => {
  const tokens = new Set<string>();
  const normalizedContent = content.trim();
  mentionRegex.lastIndex = 0;
  let matched = mentionRegex.exec(normalizedContent);
  while (matched) {
    tokens.add(normalizeMentionValue(matched[1]));
    matched = mentionRegex.exec(normalizedContent);
  }
  return Array.from(tokens);
};

const getProjectUserIds = async (projectId: string) => {
  const project = await ProjectModel.findById(projectId);
  if (!project) throw errors.notFound("Project khong ton tai");

  const allUserIds = new Set<string>();
  allUserIds.add(project.userId.toString());
  project.members.forEach((member) => allUserIds.add(member.userId.toString()));
  return { project, userIds: Array.from(allUserIds) };
};

const toChatMessageResponse = (message: any) => ({
  id: message._id.toString(),
  scope: message.scope,
  projectId: message.projectId ? message.projectId.toString() : undefined,
  senderUserId: message.senderUserId.toString(),
  senderName: message.senderName,
  senderEmail: message.senderEmail,
  content: message.content,
  mentions: (message.mentions || []).map((item: any) => item.toString()),
  deepLink: message.deepLink,
  hasSnapshot: !!message.snapshotStorageKey,
  createdAt: message.createdAt
});

const resolveMentionedUsers = async (scope: ChatScope, projectId: string | undefined, content: string) => {
  const mentionTokens = extractMentionTokens(content);
  if (mentionTokens.length === 0) return [];

  let candidateUsers: Array<{ _id: any; name: string; email: string }> = [];
  if (scope === "project") {
    const { userIds } = await getProjectUserIds(projectId!);
    candidateUsers = await UserModel.find({ _id: { $in: userIds } }).select("_id name email").lean();
  } else {
    candidateUsers = await UserModel.find({}).select("_id name email").lean();
  }

  return candidateUsers.filter((candidate) => {
    const nameToken = normalizeMentionValue(candidate.name || "");
    const emailToken = normalizeMentionValue(candidate.email?.split("@")[0] || "");
    return mentionTokens.includes(nameToken) || mentionTokens.includes(emailToken);
  });
};

const assertChatScopeAccess = async (scope: ChatScope, projectId: string | undefined, userId: string) => {
  if (scope !== "project") return;
  const project = await ProjectModel.findById(projectId);
  ensureProjectRole(project, userId, "technician", "Project khong ton tai hoac khong co quyen");
};

const toMentionCandidate = (user: { _id: any; name?: string; email: string }) => {
  const nameToken = normalizeMentionValue(user.name || "");
  const emailToken = normalizeMentionValue(user.email?.split("@")[0] || "");
  return {
    id: user._id.toString(),
    name: user.name || user.email,
    email: user.email,
    mentionToken: nameToken || emailToken
  };
};

router.get(
  "/mention-candidates",
  requireAuth,
  validate(listMentionCandidatesSchema),
  asyncHandler(async (req, res) => {
    const scope = req.query.scope as ChatScope;
    const projectId = req.query.projectId as string | undefined;

    await assertChatScopeAccess(scope, projectId, req.user!.id);

    let users: Array<{ _id: any; name?: string; email: string }> = [];
    if (scope === "project") {
      const { userIds } = await getProjectUserIds(projectId!);
      users = await UserModel.find({ _id: { $in: userIds } }).select("_id name email").sort({ name: 1 }).lean();
    } else {
      users = await UserModel.find({}).select("_id name email").sort({ name: 1 }).limit(500).lean();
    }

    return sendSuccess(
      res,
      users
        .map((user) => toMentionCandidate(user))
        .filter((item) => item.mentionToken)
    );
  })
);

router.get(
  "/messages",
  requireAuth,
  validate(listChatMessagesSchema),
  asyncHandler(async (req, res) => {
    const scope = req.query.scope as ChatScope;
    const projectId = req.query.projectId as string | undefined;
    const limit = (req.query.limit as number | undefined) ?? 50;
    const before = req.query.before as number | undefined;

    await assertChatScopeAccess(scope, projectId, req.user!.id);

    const filter: Record<string, unknown> = { scope };
    if (scope === "project") {
      filter.projectId = projectId;
    }
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessageModel.find(filter).sort({ createdAt: -1 }).limit(limit);
    const ordered = messages.reverse().map((message) => toChatMessageResponse(message));
    return sendSuccess(res, ordered);
  })
);

router.post(
  "/messages",
  requireAuth,
  validate(createChatMessageSchema),
  asyncHandler(async (req, res) => {
    const { scope, projectId, content, deepLink, snapshotDataUrl } = req.body as {
      scope: ChatScope;
      projectId?: string;
      content: string;
      deepLink?: ChatDeepLink;
      snapshotDataUrl?: string;
    };

    await assertChatScopeAccess(scope, projectId, req.user!.id);

    const safeContent = sanitizeText(content).trim();
    if (!safeContent) {
      throw errors.validation("Noi dung chat khong duoc de trong");
    }

    const [mentionedUsers, snapshot] = await Promise.all([
      resolveMentionedUsers(scope, projectId, safeContent),
      saveSnapshot(snapshotDataUrl)
    ]);

    const message = await ChatMessageModel.create({
      scope,
      projectId,
      senderUserId: req.user!.id,
      senderName: req.user!.name || req.user!.email,
      senderEmail: req.user!.email,
      content: safeContent,
      mentions: mentionedUsers.map((item) => item._id),
      deepLink,
      snapshotStorageKey: snapshot?.storageKey,
      snapshotMimeType: snapshot?.mimeType
    });

    const payload = toChatMessageResponse(message);
    let recipientUserIds: string[] = [];
    if (scope === "project") {
      const { userIds } = await getProjectUserIds(projectId!);
      recipientUserIds = userIds;
    } else {
      const users = await UserModel.find({}).select("_id").lean();
      recipientUserIds = users.map((item) => item._id.toString());
    }
    publishToUsers(recipientUserIds, "chat:message", payload);

    const mentionTargetIds = mentionedUsers
      .map((item) => item._id.toString())
      .filter((id) => id !== req.user!.id);
    if (mentionTargetIds.length > 0) {
      const mentionTitle = scope === "project" ? "Bạn được nhắc tên trong project chat" : "Bạn được nhắc tên";
      await createAndPublishNotifications(
        mentionTargetIds.map((recipientUserId) => ({
          recipientUserId,
          actorUserId: req.user!.id,
          type: "mention",
          title: mentionTitle,
          message: `${req.user!.name || req.user!.email}: ${safeContent.slice(0, 180)}`,
          data: {
            scope,
            projectId,
            chatMessageId: message._id.toString(),
            deepLink
          }
        }))
      );

      // Send email notifications for mentions
      let projectName: string | undefined;
      if (scope === "project" && projectId) {
        const project = await ProjectModel.findById(projectId);
        projectName = project?.name;
      }

      // Send emails in parallel without blocking the response
      Promise.all(
        mentionedUsers
          .filter((user) => user._id.toString() !== req.user!.id)
          .map((user) =>
            sendMentionEmail({
              recipientEmail: user.email,
              recipientName: user.name || user.email,
              actorName: req.user!.name || req.user!.email,
              message: safeContent.slice(0, 180),
              scope,
              projectName,
              deepLinkUrl: undefined // Can be enhanced later with full URL
            })
          )
      ).catch((error) => {
        // Log error but don't fail the request
        console.error("Failed to send mention emails:", error);
      });
    }

    return sendSuccess(res, payload, {}, 201);
  })
);

router.get(
  "/messages/:id/snapshot",
  requireAuth,
  validate(chatMessageIdSchema),
  asyncHandler(async (req, res) => {
    const message = await ChatMessageModel.findById(req.params.id);
    if (!message) throw errors.notFound("Tin nhan khong ton tai");
    if (!message.snapshotStorageKey || !message.snapshotMimeType) {
      throw errors.notFound("Tin nhan khong co snapshot");
    }

    await assertChatScopeAccess(message.scope, message.projectId?.toString(), req.user!.id);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Content-Type", message.snapshotMimeType);
    res.setHeader("Content-Disposition", `inline; filename="${path.basename(message.snapshotStorageKey)}"`);

    if (config.storageType === "s3") {
      const stream = await getS3Stream(message.snapshotStorageKey);
      stream.pipe(res);
      return;
    }

    const localPath = getSnapshotLocalPath(message.snapshotStorageKey);
    if (!fs.existsSync(localPath)) throw errors.notFound("Khong tim thay file snapshot");
    fs.createReadStream(localPath).pipe(res);
  })
);

export default router;
