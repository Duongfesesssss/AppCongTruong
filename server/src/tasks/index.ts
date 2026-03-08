import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { TaskModel } from "./task.model";
import { CounterModel } from "./counter.model";
import { createOrUpdateTaskSchema, listTaskSchema, taskIdSchema } from "./task.schema";
import { DrawingModel } from "../drawings/drawing.model";
import { ProjectModel } from "../projects/project.model";
import { buildProjectAccessFilter, ensureProjectRole } from "../projects/project-access";
import { PhotoModel } from "../photos/photo.model";
import { ZoneModel } from "../zones/zone.model";
import { formatPinCode, sanitizeText, toCode } from "../lib/utils";
import type { TaskCategory, TaskStatus } from "../lib/constants";
import { createAndPublishNotifications } from "../notifications/service";
import { UserModel } from "../users/user.model";

const router = Router();

const sanitizeOptional = (value?: string) => (value ? sanitizeText(value) : undefined);
const sanitizeNotes = (notes?: string[]) => notes?.map((note) => sanitizeText(note)) ?? undefined;
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeTagName = (value: string) => {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9.:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};
const sanitizeTagNames = (tagNames?: string[]) => {
  const normalized = (tagNames || [])
    .map((tagName) => normalizeTagName(tagName))
    .filter(Boolean);
  return Array.from(new Set(normalized));
};
const mentionRegex = /@([a-zA-Z0-9._-]{2,64})/g;
const stripDiacritics = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normalizeMentionValue = (value: string) => stripDiacritics(value).toLowerCase().replace(/\s+/g, "");

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

const resolveTaskMentionRecipientIds = async (project: any, actorUserId: string, mentionText: string) => {
  const mentionTokens = extractMentionTokens(mentionText);
  if (mentionTokens.length === 0) return [];

  const userIds = new Set<string>();
  userIds.add(project.userId.toString());
  project.members?.forEach((member: any) => userIds.add(member.userId.toString()));

  const users = await UserModel.find({ _id: { $in: Array.from(userIds) } }).select("_id name email").lean();
  return users
    .filter((user) => {
      const nameToken = normalizeMentionValue(user.name || "");
      const emailToken = normalizeMentionValue(user.email?.split("@")[0] || "");
      return mentionTokens.includes(nameToken) || mentionTokens.includes(emailToken);
    })
    .map((user) => user._id.toString())
    .filter((userId) => userId !== actorUserId);
};

const taskStatusLabelMap: Record<string, string> = {
  instruction: "Hướng dẫn",
  rfi: "RFI",
  resolved: "Đã hoàn thành",
  approved: "Đã QA duyệt",
  open: "Mở",
  in_progress: "Đang làm",
  blocked: "Cần xử lý",
  done: "Xong"
};

const getTaskStatusLabel = (status?: string) => taskStatusLabelMap[status || ""] || status || "Không xác định";

const getProjectRecipientUserIds = (project: any, actorUserId: string) => {
  const uniqueUserIds = new Set<string>();
  uniqueUserIds.add(project.userId.toString());
  project.members?.forEach((member: any) => uniqueUserIds.add(member.userId.toString()));

  uniqueUserIds.delete(actorUserId);
  return Array.from(uniqueUserIds);
};

router.post(
  "/",
  requireAuth,
  validate(createOrUpdateTaskSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      id?: string;
      drawingId?: string;
      pinX?: number;
      pinY?: number;
      status?: TaskStatus;
      category?: TaskCategory;
      description?: string;
      mentionText?: string;
      roomName?: string;
      pinName?: string;
      gewerk?: string;
      tagNames?: string[];
      notes?: string[];
    };

    if (body.id) {
      const task = await TaskModel.findById(body.id);
      if (!task) throw errors.notFound("Task không tồn tại");

      const project = await ProjectModel.findById(task.projectId);
      ensureProjectRole(project, req.user!.id, "technician", "Task không tồn tại hoặc không có quyền");

      const oldStatus = task.status;
      const mentionText = sanitizeOptional(body.mentionText);

      if (body.pinX !== undefined) task.pinX = body.pinX;
      if (body.pinY !== undefined) task.pinY = body.pinY;
      if (body.status) task.status = body.status;
      if (body.category) task.category = body.category;
      if (body.description !== undefined) task.description = sanitizeOptional(body.description);
      if (body.roomName !== undefined) task.roomName = sanitizeOptional(body.roomName);
      if (body.pinName !== undefined) {
        // #22 Check duplicate pinName on update (exclude self)
        const trimmedPinName = body.pinName?.trim();
        if (trimmedPinName) {
          const duplicate = await TaskModel.findOne({
            projectId: task.projectId,
            pinName: { $regex: new RegExp(`^${escapeRegExp(trimmedPinName)}$`, "i") },
            _id: { $ne: task._id }
          });
          if (duplicate) {
            throw errors.conflict(`Tên Pin "${body.pinName}" đã tồn tại trong dự án (mã: ${duplicate.pinCode})`);
          }
        }
        task.pinName = sanitizeOptional(body.pinName);
      }
      if (body.gewerk !== undefined) task.gewerk = sanitizeOptional(body.gewerk);
      if (body.tagNames !== undefined) task.tagNames = sanitizeTagNames(body.tagNames);
      if (body.notes !== undefined) task.notes = sanitizeNotes(body.notes) ?? [];
      if (mentionText) {
        const nextNotes = [...(task.notes || []), mentionText];
        task.notes = nextNotes.slice(-100);
      }

      await task.save();

      if (body.status && body.status !== oldStatus) {
        if (project) {
          const recipientUserIds = getProjectRecipientUserIds(project, req.user!.id);
          if (recipientUserIds.length > 0) {
            await createAndPublishNotifications(
              recipientUserIds.map((recipientUserId) => ({
                recipientUserId,
                actorUserId: req.user!.id,
                type: "task_status_changed",
                title: "Task đã thay đổi trạng thái",
                message: `${task.pinName || task.pinCode}: ${getTaskStatusLabel(oldStatus)} -> ${getTaskStatusLabel(
                  task.status
                )}`,
                data: {
                  taskId: task._id.toString(),
                  drawingId: task.drawingId.toString(),
                  oldStatus,
                  newStatus: task.status,
                  deepLink: {
                    drawingId: task.drawingId.toString(),
                    taskId: task._id.toString(),
                    pinX: task.pinX,
                    pinY: task.pinY,
                    zoom: 1.8
                  }
                }
              }))
            );
          }
        }
      }

      if (mentionText && project) {
        const mentionRecipientIds = await resolveTaskMentionRecipientIds(project, req.user!.id, mentionText);
        if (mentionRecipientIds.length > 0) {
          await createAndPublishNotifications(
            mentionRecipientIds.map((recipientUserId) => ({
              recipientUserId,
              actorUserId: req.user!.id,
              type: "mention",
              title: "Bạn được nhắc tên trong task",
              message: `${req.user!.name || req.user!.email}: ${mentionText.slice(0, 180)}`,
              data: {
                taskId: task._id.toString(),
                drawingId: task.drawingId.toString(),
                deepLink: {
                  drawingId: task.drawingId.toString(),
                  taskId: task._id.toString(),
                  pinX: task.pinX,
                  pinY: task.pinY,
                  zoom: 2
                }
              }
            }))
          );
        }
      }

      return sendSuccess(res, task);
    }

    const drawingId = body.drawingId as string;
    const drawing = await DrawingModel.findById(drawingId);
    if (!drawing) throw errors.notFound("Drawing không tồn tại");

    // Check ownership through project
    const project = await ProjectModel.findById(drawing.projectId);
    ensureProjectRole(project, req.user!.id, "admin", "Drawing không tồn tại hoặc không có quyền");

    const counter = await CounterModel.findOneAndUpdate(
      { _id: project!._id.toString() },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    // #22 Check duplicate pinName within the same project
    const trimmedPinName = body.pinName?.trim();
    if (trimmedPinName) {
      const duplicate = await TaskModel.findOne({
        projectId: project!._id,
        pinName: { $regex: new RegExp(`^${escapeRegExp(trimmedPinName)}$`, "i") }
      });
      if (duplicate) {
        throw errors.conflict(`Tên Pin "${body.pinName}" đã tồn tại trong dự án (mã: ${duplicate.pinCode})`);
      }
    }

    const gewerkCode = toCode(body.gewerk ?? "NA", 2);
    const buildingCode = toCode(drawing.parsedMetadata?.buildingCode || "NA", 2);
    const floorCode = toCode(drawing.parsedMetadata?.floorCode || "NA", 2);
    const pinCode = formatPinCode(project!.code, buildingCode, floorCode, gewerkCode, counter.seq);
    const drawingTags = sanitizeTagNames(drawing.tagNames || []);
    const tagNames = sanitizeTagNames(body.tagNames ?? drawingTags);

    const task = await TaskModel.create({
      projectId: project!._id,
      buildingId: drawing.buildingId,
      floorId: drawing.floorId,
      disciplineId: drawing.disciplineId,
      drawingId: drawing._id,
      pinX: body.pinX as number,
      pinY: body.pinY as number,
      status: body.status as TaskStatus,
      category: body.category as TaskCategory,
      description: sanitizeOptional(body.description),
      roomName: sanitizeOptional(body.roomName),
      pinName: sanitizeOptional(body.pinName),
      gewerk: sanitizeOptional(body.gewerk),
      tagNames,
      notes: sanitizeNotes(body.notes) ?? [],
      pinCode,
      createdBy: req.user!.id
    });

    return sendSuccess(res, task, {}, 201);
  })
);

// #13/#14 Pin name suggestions for autofill
router.get(
  "/pin-suggestions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const drawingId = req.query.drawingId as string | undefined;
    if (!drawingId) return sendSuccess(res, []);

    const drawing = await DrawingModel.findById(drawingId);
    if (!drawing) return sendSuccess(res, []);

    const project = await ProjectModel.findById(drawing.projectId);
    if (!project) return sendSuccess(res, []);
    try {
      ensureProjectRole(project, req.user!.id, "technician", "Drawing không tồn tại hoặc không có quyền");
    } catch {
      return sendSuccess(res, []);
    }

    const tasks = await TaskModel.find(
      { projectId: project!._id, pinName: { $exists: true, $ne: "" } },
      { pinName: 1, pinCode: 1, roomName: 1, gewerk: 1, status: 1, category: 1, description: 1, _id: 0 }
    ).sort({ createdAt: -1 }).limit(100).lean();

    // Deduplicate by pinName
    const seen = new Set<string>();
    const suggestions = tasks.filter((t) => {
      if (!t.pinName || seen.has(t.pinName)) return false;
      seen.add(t.pinName);
      return true;
    });

    return sendSuccess(res, suggestions);
  })
);

router.get(
  "/",
  requireAuth,
  validate(listTaskSchema),
  asyncHandler(async (req, res) => {
    // Get user's project IDs first
    const userProjects = await ProjectModel.find(buildProjectAccessFilter(req.user!.id)).select("_id");
    const projectIds = userProjects.map((p) => p._id);
    const projectIdSet = new Set(projectIds.map((projectId) => projectId.toString()));

    const filter: Record<string, unknown> = { projectId: { $in: projectIds } };
    if (req.query.projectId) {
      const requestedProjectId = String(req.query.projectId);
      if (!projectIdSet.has(requestedProjectId)) return sendSuccess(res, []);
      filter.projectId = requestedProjectId;
    }
    if (req.query.drawingId) filter.drawingId = req.query.drawingId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.tagName) {
      filter.tagNames = normalizeTagName(String(req.query.tagName));
    }
    if (Array.isArray(req.query.tagNames) && req.query.tagNames.length > 0) {
      filter.tagNames = {
        $in: sanitizeTagNames(req.query.tagNames.map((value) => String(value)))
      };
    }

    const tasks = await TaskModel.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, tasks);
  })
);

router.get(
  "/:id",
  requireAuth,
  validate(taskIdSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findById(req.params.id);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    const project = await ProjectModel.findById(task.projectId);
    ensureProjectRole(project, req.user!.id, "technician", "Task không tồn tại hoặc không có quyền");

    return sendSuccess(res, task);
  })
);

router.get(
  "/:id/hierarchy",
  requireAuth,
  validate(taskIdSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findById(req.params.id);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    const project = await ProjectModel.findById(task.projectId);
    ensureProjectRole(project, req.user!.id, "technician", "Task không tồn tại hoặc không có quyền");

    const drawing = await DrawingModel.findById(task.drawingId);
    return sendSuccess(res, {
      task,
      project: project!,
      drawing,
      parsedMetadata: drawing?.parsedMetadata ?? null
    });
  })
);

router.get(
  "/:id/photos",
  requireAuth,
  validate(taskIdSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findById(req.params.id);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    ensureProjectRole(
      await ProjectModel.findById(task.projectId),
      req.user!.id,
      "technician",
      "Task không tồn tại hoặc không có quyền"
    );

    const photos = await PhotoModel.find({ taskId: req.params.id }).sort({ createdAt: -1 });
    return sendSuccess(res, photos);
  })
);

router.get(
  "/:id/zone",
  requireAuth,
  validate(taskIdSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findById(req.params.id);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    ensureProjectRole(
      await ProjectModel.findById(task.projectId),
      req.user!.id,
      "technician",
      "Task không tồn tại hoặc không có quyền"
    );

    const zone = await ZoneModel.findOne({ taskId: req.params.id });
    if (!zone) throw errors.notFound("Zone không tồn tại");
    return sendSuccess(res, zone);
  })
);

// DELETE /api/tasks/:id - Xóa task
router.delete(
  "/:id",
  requireAuth,
  validate(taskIdSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findById(req.params.id);
    if (!task) throw errors.notFound("Task không tồn tại");

    // Check ownership
    ensureProjectRole(
      await ProjectModel.findById(task.projectId),
      req.user!.id,
      "admin",
      "Task không tồn tại hoặc không có quyền"
    );

    // Delete associated photos and zones
    await Promise.all([
      PhotoModel.deleteMany({ taskId: req.params.id }),
      ZoneModel.deleteMany({ taskId: req.params.id })
    ]);

    // Delete task
    await TaskModel.findByIdAndDelete(req.params.id);

    return sendSuccess(res, { message: "Đã xoá task thành công" });
  })
);

export default router;
