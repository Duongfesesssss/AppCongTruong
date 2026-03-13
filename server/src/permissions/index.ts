import { Router } from "express";
import { Types } from "mongoose";

import { asyncHandler, sendSuccess } from "../lib/response";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { ProjectModel } from "../projects/project.model";
import {
  ensureAdmin,
  getProjectRole,
  getUserPermissions,
  getPermissionMatrix,
  validatePermissionMatrix,
  computePermissionChanges,
  initializePermissionMatrix
} from "./permission-helpers";
import {
  permissionMetadata,
  permissionKeys,
  projectRoles,
  defaultPermissionMatrix
} from "./permission-constants";

const router = Router();

/**
 * GET /projects/:id/permissions
 * Get permission matrix for a project
 */
router.get(
  "/:id/permissions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await ProjectModel.findById(id);
    if (!project) {
      throw errors.notFound("Project khong ton tai hoac khong co quyen");
    }

    // Check if user is member
    const role = getProjectRole(project, userId);
    if (!role) {
      throw errors.notFound("Project khong ton tai hoac khong co quyen");
    }

    // Get permission matrix (or default if not set)
    const matrix = getPermissionMatrix(project);

    // Get user's resolved permissions
    const userPermissions = getUserPermissions(project, userId);

    // Return data
    return sendSuccess(res, {
      projectId: id,
      myRole: role,
      myPermissions: userPermissions,
      permissionMatrix: {
        roles: matrix
      },
      // Metadata for UI
      metadata: {
        permissions: permissionMetadata,
        roles: projectRoles.map((r) => ({
          key: r,
          label: getRoleLabel(r)
        })),
        permissionKeys: permissionKeys
      },
      // Can user edit matrix?
      canEdit: role === "admin"
    });
  })
);

/**
 * PUT /projects/:id/permissions
 * Update permission matrix for a project (Admin only)
 */
router.put(
  "/:id/permissions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { permissionMatrix } = req.body as { permissionMatrix?: unknown };

    const project = await ProjectModel.findById(id);
    ensureAdmin(project, userId);

    // Validate payload
    if (!permissionMatrix) {
      throw errors.validation("permissionMatrix is required");
    }

    const validation = validatePermissionMatrix(permissionMatrix);
    if (!validation.valid) {
      throw errors.validation(validation.errors.join("; "));
    }

    const newMatrix = (permissionMatrix as { roles: Record<string, Record<string, boolean>> }).roles;

    // Compute changes for audit log
    const oldMatrix = getPermissionMatrix(project);
    const changes = computePermissionChanges(oldMatrix, newMatrix);

    // Update project
    project!.permissionMatrix = {
      roles: newMatrix
    };

    // Add to audit log
    if (!project!.permissionChangeLogs) {
      project!.permissionChangeLogs = [];
    }

    project!.permissionChangeLogs.push({
      changedBy: new Types.ObjectId(userId),
      changedAt: new Date(),
      action: "matrix_updated",
      changes
    });

    // Limit audit log size to last 100 entries
    if (project!.permissionChangeLogs.length > 100) {
      project!.permissionChangeLogs = project!.permissionChangeLogs.slice(-100);
    }

    await project!.save();

    return sendSuccess(res, {
      projectId: id,
      permissionMatrix: project!.permissionMatrix,
      changesCount: changes.length
    });
  })
);

/**
 * POST /projects/:id/permissions/reset
 * Reset permission matrix to default (Admin only)
 */
router.post(
  "/:id/permissions/reset",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await ProjectModel.findById(id);
    ensureAdmin(project, userId);

    // Reset to default
    const oldMatrix = getPermissionMatrix(project);
    const newMatrix = defaultPermissionMatrix;
    const changes = computePermissionChanges(oldMatrix, newMatrix);

    project!.permissionMatrix = initializePermissionMatrix();

    // Add to audit log
    if (!project!.permissionChangeLogs) {
      project!.permissionChangeLogs = [];
    }

    project!.permissionChangeLogs.push({
      changedBy: new Types.ObjectId(userId),
      changedAt: new Date(),
      action: "matrix_reset",
      changes
    });

    // Limit audit log size
    if (project!.permissionChangeLogs.length > 100) {
      project!.permissionChangeLogs = project!.permissionChangeLogs.slice(-100);
    }

    await project!.save();

    return sendSuccess(res, {
      projectId: id,
      permissionMatrix: project!.permissionMatrix,
      message: "Da reset permission matrix ve mac dinh"
    });
  })
);

/**
 * GET /projects/:id/permissions/logs
 * Get permission change audit logs (Admin only)
 */
router.get(
  "/:id/permissions/logs",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);

    const project = await ProjectModel.findById(id).populate("permissionChangeLogs.changedBy", "name email");
    ensureAdmin(project, userId);

    const logs = (project!.permissionChangeLogs || [])
      .slice(-limit)
      .reverse()
      .map((log) => ({
        changedBy: log.changedBy,
        changedAt: log.changedAt,
        action: log.action,
        changes: log.changes || []
      }));

    return sendSuccess(res, {
      projectId: id,
      logs
    });
  })
);

// Helper function to get Vietnamese label for role
const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: "Admin",
    "quan-ly-du-an": "Quản lý dự án",
    "chu-thau": "Chủ thầu",
    "thiet-ke": "Thiết kế",
    "thau-phu": "Thầu phụ",
    tho: "Thợ",
    "nguoi-quan-sat": "Người quan sát",
    // Legacy
    technician: "Kỹ thuật viên"
  };
  return labels[role] || role;
};

export default router;
