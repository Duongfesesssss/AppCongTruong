import { Router } from "express";
import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { ProjectModel } from "../projects/project.model";
import { ensureProjectRole } from "../projects/project-access";
import {
  createNamingConventionSchema,
  updateNamingConventionSchema,
  getNamingConventionSchema,
  deleteNamingConventionSchema,
  validateFilenameSchema
} from "./naming-convention.schema";
import { NamingConventionModel } from "./naming-convention.model";
import { createDefaultNamingFields } from "./default-keywords";
import { parseFilenameWithConvention, generateFormatSuggestion } from "./flexible-parser";

const router = Router();

/**
 * GET /api/naming-conventions/:projectId
 * Lấy naming convention config của project
 */
router.get(
  "/:projectId",
  requireAuth,
  validate(getNamingConventionSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "technician", "Project khong ton tai hoac khong co quyen");

    const convention = await NamingConventionModel.findOne({ projectId });

    if (!convention) {
      // Trả về default config nếu chưa có
      return sendSuccess(res, {
        projectId,
        separator: "-",
        fields: createDefaultNamingFields(),
        isDefault: true
      });
    }

    return sendSuccess(res, convention);
  })
);

/**
 * POST /api/naming-conventions
 * Tạo hoặc cập nhật naming convention config cho project
 */
router.post(
  "/",
  requireAuth,
  validate(createNamingConventionSchema),
  asyncHandler(async (req, res) => {
    const { projectId, separator, fields } = req.body;

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "admin", "Chi admin moi co the cau hinh naming convention");

    // Validate: Không được có 2 field cùng type và enabled
    const enabledTypes = fields.filter((f: any) => f.enabled).map((f: any) => f.type);
    const uniqueTypes = new Set(enabledTypes);
    if (enabledTypes.length !== uniqueTypes.size) {
      throw errors.validation("Khong duoc co 2 truong cung type va enabled");
    }

    // Upsert naming convention
    const convention = await NamingConventionModel.findOneAndUpdate(
      { projectId },
      {
        projectId,
        separator: separator || "-",
        fields,
        createdBy: req.user!.id
      },
      { upsert: true, new: true }
    );

    return sendSuccess(res, convention);
  })
);

/**
 * PUT /api/naming-conventions/:projectId
 * Cập nhật naming convention config
 */
router.put(
  "/:projectId",
  requireAuth,
  validate(updateNamingConventionSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { separator, fields } = req.body;

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "admin", "Chi admin moi co the cap nhat naming convention");

    const convention = await NamingConventionModel.findOne({ projectId });
    if (!convention) {
      throw errors.notFound("Naming convention chua duoc cau hinh");
    }

    // Validate nếu có fields
    if (fields) {
      const enabledTypes = fields.filter((f: any) => f.enabled).map((f: any) => f.type);
      const uniqueTypes = new Set(enabledTypes);
      if (enabledTypes.length !== uniqueTypes.size) {
        throw errors.validation("Khong duoc co 2 truong cung type va enabled");
      }
    }

    // Update
    if (separator !== undefined) {
      convention.separator = separator;
    }
    if (fields !== undefined) {
      convention.fields = fields;
    }

    await convention.save();

    return sendSuccess(res, convention);
  })
);

/**
 * DELETE /api/naming-conventions/:projectId
 * Xóa naming convention config (reset về default)
 */
router.delete(
  "/:projectId",
  requireAuth,
  validate(deleteNamingConventionSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "admin", "Chi admin moi co the xoa naming convention");

    await NamingConventionModel.deleteOne({ projectId });

    return sendSuccess(res, { message: "Da reset naming convention ve mac dinh" });
  })
);

/**
 * POST /api/naming-conventions/:projectId/validate
 * Validate filename theo naming convention của project
 */
router.post(
  "/:projectId/validate",
  requireAuth,
  validate(validateFilenameSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { filename } = req.body;

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "technician", "Project khong ton tai hoac khong co quyen");

    let convention = await NamingConventionModel.findOne({ projectId });

    // Nếu chưa có config, dùng default
    if (!convention) {
      convention = new NamingConventionModel({
        projectId,
        separator: "-",
        fields: createDefaultNamingFields(),
        createdBy: req.user!.id
      });
    }

    // Parse filename
    const parsed = parseFilenameWithConvention(filename, convention);

    // Generate format suggestion
    const suggestedFormat = generateFormatSuggestion(convention);

    return sendSuccess(res, {
      filename,
      parsed,
      suggestedFormat,
      convention: {
        separator: convention.separator,
        fields: convention.fields
      }
    });
  })
);

/**
 * GET /api/naming-conventions/:projectId/format-suggestion
 * Lấy format suggestion từ naming convention
 */
router.get(
  "/:projectId/format-suggestion",
  requireAuth,
  validate(getNamingConventionSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "technician", "Project khong ton tai hoac khong co quyen");

    let convention = await NamingConventionModel.findOne({ projectId });

    // Nếu chưa có config, dùng default
    if (!convention) {
      convention = new NamingConventionModel({
        projectId,
        separator: "-",
        fields: createDefaultNamingFields(),
        createdBy: req.user!.id
      });
    }

    const suggestedFormat = generateFormatSuggestion(convention);

    return sendSuccess(res, {
      format: suggestedFormat,
      separator: convention.separator,
      fields: convention.fields.filter((f) => f.enabled).sort((a, b) => a.order - b.order)
    });
  })
);

export default router;
