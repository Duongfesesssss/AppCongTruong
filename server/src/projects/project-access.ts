/**
 * Enhanced project-access module with permission matrix support
 * Maintains backward compatibility with legacy role-based checks
 */

import type { FilterQuery } from "mongoose";

import { errors } from "../lib/errors";
import type { ProjectDocument, ProjectMemberRole } from "./project.model";
import { hasPermission, getUserPermissions } from "../permissions/permission-helpers";
import type { PermissionKey } from "../permissions/permission-constants";

type ProjectLike = {
  userId?: unknown;
  members?: Array<{
    userId?: unknown;
    role?: unknown;
  }>;
  permissionMatrix?: {
    roles?: Record<string, Record<string, boolean>>;
  };
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

export const getProjectRole = (project: ProjectLike, userId: string): ProjectMemberRole | string | null => {
  if (!project) return null;
  if (toIdString(project.userId) === userId) return "admin";

  const member = project.members?.find((item) => toIdString(item.userId) === userId);
  if (!member || !member.role) return null;

  // Return role as string (supports both legacy and new roles)
  return member.role as string;
};

/**
 * Legacy role-based authorization (backward compatible)
 */
export const ensureProjectRole = (
  project: ProjectLike | null,
  userId: string,
  minRole: ProjectMemberRole = "technician",
  notFoundMessage = "Project khong ton tai hoac khong co quyen"
) => {
  if (!project) throw errors.notFound(notFoundMessage);

  const role = getProjectRole(project, userId);
  if (!role) throw errors.notFound(notFoundMessage);

  // Only check weight for legacy roles
  if (isRole(role)) {
    if (roleWeight[role] < roleWeight[minRole]) {
      throw errors.forbidden("Khong co quyen thuc hien thao tac nay");
    }
  } else {
    // For new roles, only admin role is allowed for admin-required operations
    if (minRole === "admin" && role !== "admin") {
      throw errors.forbidden("Khong co quyen thuc hien thao tac nay");
    }
  }

  return role;
};

/**
 * Permission-based authorization (new system)
 * Use this for new features or when migrating existing features
 */
export const ensureProjectPermission = (
  project: ProjectLike | null,
  userId: string,
  permission: PermissionKey,
  notFoundMessage = "Project khong ton tai hoac khong co quyen"
) => {
  if (!project) throw errors.notFound(notFoundMessage);

  const role = getProjectRole(project, userId);
  if (!role) throw errors.notFound(notFoundMessage);

  if (!hasPermission(project as any, userId, permission)) {
    throw errors.forbidden(`Khong co quyen: ${permission}`);
  }

  return role;
};

/**
 * Check if user has a specific permission (returns boolean, doesn't throw)
 */
export const checkProjectPermission = (
  project: ProjectLike | null,
  userId: string,
  permission: PermissionKey
): boolean => {
  if (!project) return false;
  const role = getProjectRole(project, userId);
  if (!role) return false;
  return hasPermission(project as any, userId, permission);
};

/**
 * Get all permissions for a user (useful for frontend)
 */
export const getProjectPermissions = (
  project: ProjectLike | null,
  userId: string
): Record<PermissionKey, boolean> => {
  return getUserPermissions(project as any, userId);
};

/**
 * Kiểm tra quyền xóa resource.
 * Chỉ người tạo (createdBy) hoặc admin mới được xóa.
 *
 * @param project - Project document
 * @param userId - ID của user hiện tại
 * @param resourceCreatorId - ID của người tạo resource (createdBy)
 * @param notFoundMessage - Thông báo lỗi khi không tìm thấy
 * @returns true nếu có quyền xóa
 * @throws 404 nếu không có quyền truy cập project
 * @throws 403 nếu không có quyền xóa
 */
export const canDeleteResource = (
  project: ProjectLike | null,
  userId: string,
  resourceCreatorId: unknown,
  notFoundMessage = "Khong co quyen truy cap resource"
): boolean => {
  if (!project) throw errors.notFound(notFoundMessage);

  const role = getProjectRole(project, userId);
  if (!role) throw errors.notFound(notFoundMessage);

  // Admin có quyền xóa mọi resource
  if (role === "admin") return true;

  // Người tạo có quyền xóa resource của mình
  const creatorIdString = toIdString(resourceCreatorId);
  if (creatorIdString && creatorIdString === userId) return true;

  // Nếu không phải admin và không phải người tạo thì không có quyền xóa
  throw errors.forbidden("Chi nguoi tao hoac admin moi co quyen xoa");
};
