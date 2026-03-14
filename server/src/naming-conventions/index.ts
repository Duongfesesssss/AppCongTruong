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
import { NamingConventionModel, type NamingField } from "./naming-convention.model";
import { createDefaultNamingFields } from "./default-keywords";
import { parseFilenameWithConvention, generateFormatSuggestion } from "./flexible-parser";

const router = Router();

const LEGACY_FIELD_TYPE_MAP: Record<string, string> = {
  projectprefix: "project",
  drawingtype: "content_type"
};

const DEFAULT_FIELD_LABELS: Record<string, string> = {
  project: "Mã dự án",
  originator: "Người tạo / Nhà thầu",
  discipline: "Bộ môn",
  building: "Tòa nhà / Khu",
  volume: "Volume / Khối",
  zone: "Khu vực",
  level: "Tầng",
  room: "Phòng",
  content_type: "Loại bản vẽ",
  file_type: "Loại file",
  grid_axis: "Trục lưới",
  runningNumber: "Số thứ tự",
  description: "Mô tả"
};

const normalizeFieldType = (type: string) => {
  const raw = String(type || "").trim();
  if (!raw) return "";
  const mapped = LEGACY_FIELD_TYPE_MAP[raw.toLowerCase()];
  return mapped || raw;
};

const normalizeNamingFields = (fields: NamingField[]): NamingField[] => {
  const byType = new Map<string, NamingField>();

  (fields || [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((field) => {
      const normalizedType = normalizeFieldType(field.type);
      if (!normalizedType) return;
      if (byType.has(normalizedType)) return;

      byType.set(normalizedType, {
        ...field,
        type: normalizedType,
        label: (field.label || "").trim() || DEFAULT_FIELD_LABELS[normalizedType] || normalizedType,
        keywords: field.keywords || []
      });
    });

  return Array.from(byType.values()).map((field, index) => ({
    ...field,
    order: index
  }));
};

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

    const normalizedFields = normalizeNamingFields(convention.fields as NamingField[]);
    if (JSON.stringify(normalizedFields) !== JSON.stringify(convention.fields)) {
      convention.fields = normalizedFields;
      await convention.save();
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
    const { projectId, separator, fields, exampleFilename } = req.body;

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "admin", "Chi admin moi co the cau hinh naming convention");

    // Upsert naming convention — dùng $set tường minh để không xoá exampleFilename cũ
    const setData: Record<string, unknown> = {
      separator: separator || "-",
      fields: normalizeNamingFields(fields)
    };
    if (exampleFilename) setData.exampleFilename = exampleFilename;

    const convention = await NamingConventionModel.findOneAndUpdate(
      { projectId },
      {
        $set: setData,
        $setOnInsert: { projectId, createdBy: req.user!.id }
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

    // Update
    if (separator !== undefined) {
      convention.separator = separator;
    }
    if (fields !== undefined) {
      convention.fields = normalizeNamingFields(fields);
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
    } else {
      convention.fields = normalizeNamingFields(convention.fields as NamingField[]);
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
    } else {
      convention.fields = normalizeNamingFields(convention.fields as NamingField[]);
    }

    const suggestedFormat = generateFormatSuggestion(convention);

    return sendSuccess(res, {
      format: suggestedFormat,
      separator: convention.separator,
      fields: convention.fields.filter((f) => f.enabled).sort((a, b) => a.order - b.order)
    });
  })
);

/**
 * POST /api/naming-conventions/:projectId/parse-filename
 * Phân tích filename thành các segment để người dùng gán tag
 * Dùng khi setup naming convention từ file đầu tiên
 */
router.post(
  "/:projectId/parse-filename",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { filename, separator } = req.body;

    if (!filename || typeof filename !== "string") {
      throw errors.validation("filename la bat buoc");
    }

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "technician", "Project khong ton tai hoac khong co quyen");

    // Loại extension
    const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

    // Auto-detect delimiter nếu không truyền vào
    let detectedSeparator = separator;
    if (!detectedSeparator) {
      const candidates = ["-", "_", ".", " "];
      let maxCount = 0;
      for (const sep of candidates) {
        const count = nameWithoutExt.split(sep).length - 1;
        if (count > maxCount) {
          maxCount = count;
          detectedSeparator = sep;
        }
      }
      if (!detectedSeparator) detectedSeparator = "-";
    }

    const segments = nameWithoutExt
      .split(detectedSeparator)
      .map((s: string) => s.trim())
      .filter(Boolean);

    return sendSuccess(res, {
      filename,
      nameWithoutExt,
      detectedSeparator,
      segments
    });
  })
);

export default router;
