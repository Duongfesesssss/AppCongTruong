import type { FilterQuery } from "mongoose";

import { errors } from "../lib/errors";
import type { ProjectDocument, ProjectMemberRole } from "./project.model";

type ProjectLike = {
  userId?: unknown;
  members?: Array<{
    userId?: unknown;
    role?: unknown;
  }>;
};

const roleWeight: Record<ProjectMemberRole, number> = {
  technician: 1,
  admin: 2
};

const toIdString = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    return value.toString();
  }
  return "";
};

const isRole = (value: unknown): value is ProjectMemberRole => {
  return value === "admin" || value === "technician";
};

export const buildProjectAccessFilter = (userId: string): FilterQuery<ProjectDocument> => ({
  $or: [{ userId }, { "members.userId": userId }]
});

export const getProjectRole = (project: ProjectLike, userId: string): ProjectMemberRole | null => {
  if (!project) return null;
  if (toIdString(project.userId) === userId) return "admin";

  const member = project.members?.find((item) => toIdString(item.userId) === userId);
  if (!member || !isRole(member.role)) return null;
  return member.role;
};

export const ensureProjectRole = (
  project: ProjectLike | null,
  userId: string,
  minRole: ProjectMemberRole = "technician",
  notFoundMessage = "Project khong ton tai hoac khong co quyen"
) => {
  if (!project) throw errors.notFound(notFoundMessage);

  const role = getProjectRole(project, userId);
  if (!role) throw errors.notFound(notFoundMessage);
  if (roleWeight[role] < roleWeight[minRole]) {
    throw errors.forbidden("Khong co quyen thuc hien thao tac nay");
  }
  return role;
};
