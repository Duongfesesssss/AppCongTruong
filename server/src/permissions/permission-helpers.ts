import { errors } from "../lib/errors";
import type { ProjectDocument } from "../projects/project.model";
import {
  defaultPermissionMatrix,
  type PermissionKey,
  type ProjectRole,
  isValidPermissionKey,
  isValidProjectRole,
  permissionKeys,
  projectRoles
} from "./permission-constants";

type ProjectLike = Pick<ProjectDocument, "userId" | "members" | "permissionMatrix">;

/**
 * Convert ObjectId-like value to string
 */
const toIdString = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    return value.toString();
  }
  return "";
};

/**
 * Get user's role in a project
 * Returns role string or null if user is not a member
 */
export const getProjectRole = (project: ProjectLike | null, userId: string): string | null => {
  if (!project) return null;

  // Owner is always admin
  if (toIdString(project.userId) === userId) return "admin";

  // Find user in members list
  const member = project.members?.find((m) => toIdString(m.userId) === userId);
  if (!member) return null;

  return member.role;
};

/**
 * Get the permission matrix for a project
 * Returns default matrix if project doesn't have one
 */
export const getPermissionMatrix = (project: ProjectLike | null): Record<string, Record<string, boolean>> => {
  if (!project?.permissionMatrix?.roles || Object.keys(project.permissionMatrix.roles).length === 0) {
    // Return default matrix
    return { ...defaultPermissionMatrix };
  }

  return project.permissionMatrix.roles;
};

/**
 * Initialize permission matrix for a project with default values
 */
export const initializePermissionMatrix = (): { roles: Record<string, Record<string, boolean>> } => {
  return {
    roles: { ...defaultPermissionMatrix }
  };
};

/**
 * Check if a user has a specific permission in a project
 */
export const hasPermission = (
  project: ProjectLike | null,
  userId: string,
  permissionKey: PermissionKey
): boolean => {
  const role = getProjectRole(project, userId);
  if (!role) return false;

  const matrix = getPermissionMatrix(project);
  const rolePermissions = matrix[role];

  if (!rolePermissions) {
    // Role not found in matrix, check if it's a valid role and use default
    if (isValidProjectRole(role)) {
      return defaultPermissionMatrix[role][permissionKey] ?? false;
    }
    return false;
  }

  return rolePermissions[permissionKey] ?? false;
};

/**
 * Ensure user has a specific permission in a project
 * Throws error if user doesn't have permission
 */
export const ensurePermission = (
  project: ProjectLike | null,
  userId: string,
  permissionKey: PermissionKey,
  notFoundMessage = "Project khong ton tai hoac khong co quyen"
): void => {
  if (!project) throw errors.notFound(notFoundMessage);

  const role = getProjectRole(project, userId);
  if (!role) throw errors.notFound(notFoundMessage);

  if (!hasPermission(project, userId, permissionKey)) {
    throw errors.forbidden(`Khong co quyen: ${permissionKey}`);
  }
};

/**
 * Ensure user is Admin (for permission matrix management)
 */
export const ensureAdmin = (
  project: ProjectLike | null,
  userId: string,
  notFoundMessage = "Project khong ton tai hoac khong co quyen"
): void => {
  if (!project) throw errors.notFound(notFoundMessage);

  const role = getProjectRole(project, userId);
  if (!role) throw errors.notFound(notFoundMessage);

  if (role !== "admin") {
    throw errors.forbidden("Chi admin moi co quyen thuc hien thao tac nay");
  }
};

/**
 * Get all permissions for a user in a project
 * Returns resolved permissions based on role and matrix
 */
export const getUserPermissions = (
  project: ProjectLike | null,
  userId: string
): Record<PermissionKey, boolean> => {
  const role = getProjectRole(project, userId);
  if (!role) {
    // Return all false if user is not a member
    return permissionKeys.reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as Record<PermissionKey, boolean>);
  }

  const matrix = getPermissionMatrix(project);
  const rolePermissions = matrix[role];

  if (!rolePermissions) {
    // Role not in matrix, use default
    if (isValidProjectRole(role)) {
      return { ...defaultPermissionMatrix[role] };
    }
    // Unknown role, return all false
    return permissionKeys.reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as Record<PermissionKey, boolean>);
  }

  // Return permissions from matrix
  const result: Record<PermissionKey, boolean> = {} as Record<PermissionKey, boolean>;
  permissionKeys.forEach((key) => {
    result[key] = rolePermissions[key] ?? false;
  });

  return result;
};

/**
 * Validate permission matrix update payload
 */
export const validatePermissionMatrix = (
  matrix: unknown
): { valid: boolean; errors: string[] } => {
  const validationErrors: string[] = [];

  if (!matrix || typeof matrix !== "object") {
    return { valid: false, errors: ["Matrix phai la mot object"] };
  }

  const matrixObj = matrix as Record<string, unknown>;

  if (!matrixObj.roles || typeof matrixObj.roles !== "object") {
    return { valid: false, errors: ["Matrix phai co truong 'roles'"] };
  }

  const roles = matrixObj.roles as Record<string, unknown>;

  // Validate each role
  for (const [role, permissions] of Object.entries(roles)) {
    if (!isValidProjectRole(role)) {
      validationErrors.push(`Role khong hop le: ${role}`);
      continue;
    }

    if (!permissions || typeof permissions !== "object") {
      validationErrors.push(`Permissions cho role ${role} phai la object`);
      continue;
    }

    const perms = permissions as Record<string, unknown>;

    // Validate each permission
    for (const [permKey, permValue] of Object.entries(perms)) {
      if (!isValidPermissionKey(permKey)) {
        validationErrors.push(`Permission key khong hop le: ${permKey}`);
      }

      if (typeof permValue !== "boolean") {
        validationErrors.push(`Gia tri permission ${permKey} cho role ${role} phai la boolean`);
      }
    }
  }

  return {
    valid: validationErrors.length === 0,
    errors: validationErrors
  };
};

/**
 * Compute permission changes between old and new matrix
 */
export const computePermissionChanges = (
  oldMatrix: Record<string, Record<string, boolean>>,
  newMatrix: Record<string, Record<string, boolean>>
): Array<{ role: string; permission: string; oldValue: boolean; newValue: boolean }> => {
  const changes: Array<{ role: string; permission: string; oldValue: boolean; newValue: boolean }> = [];

  // Get all roles from both matrices
  const allRoles = new Set([...Object.keys(oldMatrix), ...Object.keys(newMatrix)]);

  for (const role of allRoles) {
    const oldPerms = oldMatrix[role] || {};
    const newPerms = newMatrix[role] || {};

    // Get all permissions from both
    const allPerms = new Set([...Object.keys(oldPerms), ...Object.keys(newPerms)]);

    for (const perm of allPerms) {
      const oldValue = oldPerms[perm] ?? false;
      const newValue = newPerms[perm] ?? false;

      if (oldValue !== newValue) {
        changes.push({
          role,
          permission: perm,
          oldValue,
          newValue
        });
      }
    }
  }

  return changes;
};
