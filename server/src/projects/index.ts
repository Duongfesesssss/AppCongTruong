import { Router } from "express";
import { type HydratedDocument, Types } from "mongoose";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { sanitizeText } from "../lib/utils";
import { errors } from "../lib/errors";
import { UserModel } from "../users/user.model";
import { ProjectModel, type ProjectDocument } from "./project.model";
import { buildProjectAccessFilter, ensureProjectRole, getProjectRole, getProjectPermissions } from "./project-access";
import { buildUniqueProjectCode } from "./project-code";
import {
  addProjectMemberSchema,
  createProjectSchema,
  listProjectMembersSchema,
  listProjectSchema,
  projectIdParamSchema,
  removeProjectMemberSchema,
  updateDrawingMetaConfigSchema
} from "./project.schema";

const router = Router();
const projectNotFoundMessage = "Project khong ton tai hoac khong co quyen";

type ProjectDocWithMethods = HydratedDocument<ProjectDocument>;

const toProjectResponse = (project: ProjectDocWithMethods, userId: string) => {
  const role = getProjectRole(project, userId);
  const permissions = getProjectPermissions(project, userId);

  return {
    ...project.toObject(),
    myRole: role,
    permissions: {
      // Legacy permissions (backward compatible)
      canManageStructure: role === "admin",
      canManageMembers: role === "admin",
      canProcessPhotos: role === "admin" || role === "technician",
      // New permission matrix
      ...permissions
    }
  };
};

const getProjectMembersPayload = async (project: ProjectDocWithMethods) => {
  const uniqueUserIds = new Set<string>();
  uniqueUserIds.add(project.userId.toString());
  project.members.forEach((member) => uniqueUserIds.add(member.userId.toString()));

  const users = await UserModel.find({ _id: { $in: Array.from(uniqueUserIds) } }).select("_id name email");
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  const ownerUserId = project.userId.toString();
  const owner = userMap.get(ownerUserId);

  const members = [
    {
      user: {
        id: ownerUserId,
        name: owner?.name ?? "Owner",
        email: owner?.email ?? ""
      },
      role: "admin" as const,
      isOwner: true,
      addedAt: project.createdAt
    },
    ...project.members
      .filter((member) => member.userId.toString() !== ownerUserId)
      .map((member) => {
        const user = userMap.get(member.userId.toString());
        return {
          user: {
            id: member.userId.toString(),
            name: user?.name ?? "Unknown",
            email: user?.email ?? ""
          },
          role: member.role,
          isOwner: false,
          addedAt: member.addedAt
        };
      })
  ];

  const sortedMembers = members.sort((a, b) => {
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    return a.user.name.localeCompare(b.user.name, "vi");
  });

  return {
    projectId: project._id.toString(),
    members: sortedMembers
  };
};

const listProjectCodesByUser = async (userId: string, excludeProjectId?: string) => {
  const filter: Record<string, unknown> = { userId };
  if (excludeProjectId) {
    filter._id = { $ne: new Types.ObjectId(excludeProjectId) };
  }

  const projects = await ProjectModel.find(filter).select("code").lean();
  return projects.map((project) => project.code);
};

router.post(
  "/",
  requireAuth,
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const { name, code, description } = req.body as {
      name: string;
      code?: string;
      description?: string;
    };

    const lastProject = await ProjectModel.findOne({ userId: req.user!.id })
      .sort({ sortIndex: -1, createdAt: -1 })
      .select("sortIndex")
      .lean();
    const nextSortIndex = (lastProject?.sortIndex ?? 0) + 1;

    // Retry up to 3 times to handle race conditions on unique code constraint
    let project: ProjectDocWithMethods | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const projectCode = buildUniqueProjectCode(
        { name, code },
        await listProjectCodesByUser(req.user!.id)
      );
      try {
        project = (await ProjectModel.create({
          userId: req.user!.id,
          members: [
            {
              userId: req.user!.id,
              role: "admin",
              addedBy: req.user!.id
            }
          ],
          name: sanitizeText(name),
          code: projectCode,
          sortIndex: nextSortIndex,
          description: description ? sanitizeText(description) : undefined
        })) as ProjectDocWithMethods;
        break;
      } catch (err: unknown) {
        const isDuplicate =
          err !== null &&
          typeof err === "object" &&
          (err as { code?: number }).code === 11000;
        if (!isDuplicate || attempt >= 2) throw err;
      }
    }

    return sendSuccess(res, toProjectResponse(project!, req.user!.id), {}, 201);
  })
);

router.get(
  "/:id/members",
  requireAuth,
  validate(listProjectMembersSchema),
  asyncHandler(async (req, res) => {
    const project = (await ProjectModel.findById(req.params.id)) as ProjectDocWithMethods | null;
    ensureProjectRole(project, req.user!.id, "admin", projectNotFoundMessage);

    return sendSuccess(res, await getProjectMembersPayload(project as ProjectDocWithMethods));
  })
);

router.post(
  "/:id/members",
  requireAuth,
  validate(addProjectMemberSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const { email, role: requestedRole } = req.body as {
      email: string;
      role?: ProjectDocument["members"][number]["role"];
    };
    const assignedRole: ProjectDocument["members"][number]["role"] = requestedRole ?? "nguoi-quan-sat";

    const project = (await ProjectModel.findById(id)) as ProjectDocWithMethods | null;
    ensureProjectRole(project, req.user!.id, "admin", projectNotFoundMessage);

    const normalizedEmail = email.trim().toLowerCase();
    const targetUser = await UserModel.findOne({ email: normalizedEmail }).select("_id name email");
    if (!targetUser) throw errors.notFound("Khong tim thay tai khoan theo email");

    const targetId = targetUser._id.toString();
    if (project!.userId.toString() === targetId) {
      throw errors.conflict("Tai khoan nay da la admin cua project");
    }

    const existingMember = project!.members.find((member) => member.userId.toString() === targetId);
    if (existingMember) {
      existingMember.role = assignedRole;
      existingMember.addedBy = new Types.ObjectId(req.user!.id);
      existingMember.addedAt = new Date();
      await project!.save();
      return sendSuccess(res, {
        user: {
          id: targetUser._id.toString(),
          name: targetUser.name,
          email: targetUser.email
        },
        role: assignedRole,
        created: false
      });
    }

    project!.members.push({
      userId: targetUser._id,
      role: assignedRole,
      addedBy: new Types.ObjectId(req.user!.id),
      addedAt: new Date()
    });
    await project!.save();

    return sendSuccess(
      res,
      {
        user: {
          id: targetUser._id.toString(),
          name: targetUser.name,
          email: targetUser.email
        },
        role: assignedRole,
        created: true
      },
      {},
      201
    );
  })
);

router.delete(
  "/:id/members/:memberUserId",
  requireAuth,
  validate(removeProjectMemberSchema),
  asyncHandler(async (req, res) => {
    const { id, memberUserId } = req.params as { id: string; memberUserId: string };

    const project = (await ProjectModel.findById(id)) as ProjectDocWithMethods | null;
    ensureProjectRole(project, req.user!.id, "admin", projectNotFoundMessage);

    if (project!.userId.toString() === memberUserId) {
      throw errors.validation("Khong the xoa owner cua project");
    }
    if (memberUserId === req.user!.id) {
      throw errors.validation("Khong the tu xoa chinh minh khoi project");
    }

    const beforeCount = project!.members.length;
    project!.members = project!.members.filter((member) => member.userId.toString() !== memberUserId);
    if (beforeCount === project!.members.length) {
      throw errors.notFound("Thanh vien khong ton tai trong project");
    }

    await project!.save();
    return sendSuccess(res, { ok: true, removedUserId: memberUserId });
  })
);

router.get(
  "/",
  requireAuth,
  validate(listProjectSchema),
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const filter: Record<string, unknown> = buildProjectAccessFilter(req.user!.id);
    if (q) filter.name = new RegExp(q, "i");

    const projects = await ProjectModel.find(filter).sort({ sortIndex: 1, createdAt: 1 });
    return sendSuccess(
      res,
      projects.map((project) => toProjectResponse(project as ProjectDocWithMethods, req.user!.id))
    );
  })
);

router.get(
  "/:id",
  requireAuth,
  validate(projectIdParamSchema),
  asyncHandler(async (req, res) => {
    const project = (await ProjectModel.findById(req.params.id)) as ProjectDocWithMethods | null;
    ensureProjectRole(project, req.user!.id, "technician", projectNotFoundMessage);
    return sendSuccess(res, toProjectResponse(project as ProjectDocWithMethods, req.user!.id));
  })
);

router.put(
  "/:id",
  requireAuth,
  validate(projectIdParamSchema),
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const { name, code, description } = req.body as {
      name: string;
      code?: string;
      description?: string;
    };

    const project = (await ProjectModel.findById(req.params.id)) as ProjectDocWithMethods | null;
    ensureProjectRole(project, req.user!.id, "admin", projectNotFoundMessage);

    const projectCode = buildUniqueProjectCode(
      { name, code },
      await listProjectCodesByUser(req.user!.id, req.params.id)
    );

    project!.name = sanitizeText(name);
    project!.code = projectCode;
    project!.description = description ? sanitizeText(description) : undefined;
    await project!.save();

    return sendSuccess(res, toProjectResponse(project as ProjectDocWithMethods, req.user!.id));
  })
);

router.patch(
  "/:id",
  requireAuth,
  validate(projectIdParamSchema),
  asyncHandler(async (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) throw errors.validation("Ten khong duoc de trong");

    const project = (await ProjectModel.findById(req.params.id)) as ProjectDocWithMethods | null;
    ensureProjectRole(project, req.user!.id, "admin", projectNotFoundMessage);

    const projectCode = buildUniqueProjectCode(
      { name },
      await listProjectCodesByUser(req.user!.id, req.params.id)
    );

    project!.name = sanitizeText(name);
    project!.code = projectCode;
    await project!.save();

    return sendSuccess(res, toProjectResponse(project as ProjectDocWithMethods, req.user!.id));
  })
);

router.delete(
  "/:id",
  requireAuth,
  validate(projectIdParamSchema),
  asyncHandler(async (req, res) => {
    const project = await ProjectModel.findById(req.params.id);
    ensureProjectRole(project, req.user!.id, "admin", projectNotFoundMessage);

    await ProjectModel.deleteOne({ _id: req.params.id });
    return sendSuccess(res, { ok: true });
  })
);

router.get(
  "/:id/drawing-config",
  requireAuth,
  validate(projectIdParamSchema),
  asyncHandler(async (req, res) => {
    const project = await ProjectModel.findById(req.params.id).lean();
    ensureProjectRole(project as any, req.user!.id, "technician", projectNotFoundMessage);
    return sendSuccess(res, {
      buildings: project?.drawingMetaConfig?.buildings || [],
      levels: project?.drawingMetaConfig?.levels || []
    });
  })
);

router.patch(
  "/:id/drawing-config",
  requireAuth,
  validate(updateDrawingMetaConfigSchema),
  asyncHandler(async (req, res) => {
    const project = await ProjectModel.findById(req.params.id);
    ensureProjectRole(project, req.user!.id, "admin", projectNotFoundMessage);

    project!.drawingMetaConfig = {
      buildings: req.body.buildings,
      levels: req.body.levels
    };
    await project!.save();
    return sendSuccess(res, {
      buildings: project!.drawingMetaConfig!.buildings,
      levels: project!.drawingMetaConfig!.levels
    });
  })
);

export default router;
