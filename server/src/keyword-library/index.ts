import { Router } from "express";
import { asyncHandler, sendSuccess } from "../lib/response";
import { requireAuth } from "../middlewares/require-auth";
import { validate } from "../middlewares/validation";
import { errors } from "../lib/errors";
import { z } from "zod";
import { KeywordLibraryModel, keywordLibraryFieldTypes } from "./keyword-library.model";
import { ALL_SEED_KEYWORDS } from "./seed-data";

const router = Router();

// ================================================================
// Seed helper — gọi lúc khởi động nếu collection trống
// ================================================================
export const seedKeywordLibraryIfEmpty = async () => {
  const count = await KeywordLibraryModel.countDocuments();
  if (count > 0) return;

  const docs = ALL_SEED_KEYWORDS.map((kw) => ({
    fieldType: kw.fieldType,
    code: kw.code.toUpperCase(),
    label: kw.label,
    aliases: (kw.aliases || []).map((a) => a.toUpperCase()),
    source: "system" as const
  }));

  await KeywordLibraryModel.insertMany(docs, { ordered: false }).catch(() => {
    // Ignore duplicate key errors during seed
  });

  console.log(`[KeywordLibrary] Seeded ${docs.length} keywords from huongdanbanve`);
};

// ================================================================
// Validation schemas
// Mã keyword: cho phép chữ, số và dấu chấm (.) — ví dụ: 2026.1
// ================================================================
const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .transform((v) => v.toUpperCase())
  .refine((v) => /^[A-Z0-9][A-Z0-9.\-]*$/.test(v), {
    message: "Mã chỉ được chứa chữ cái, số, dấu chấm (.) hoặc gạch ngang (-)"
  });

const addKeywordSchema = z.object({
  body: z.object({
    fieldType: z.enum(keywordLibraryFieldTypes),
    code: codeSchema,
    label: z.string().trim().min(1).max(100),
    aliases: z.array(z.string().trim().max(30).toUpperCase()).optional()
  })
});

const fieldTypeQuerySchema = z.object({
  query: z.object({
    fieldType: z.enum(keywordLibraryFieldTypes).optional()
  })
});

const keywordIdSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

// ================================================================
// GET /api/keyword-library?fieldType=discipline
// Lấy tất cả keywords (có thể filter theo fieldType)
// ================================================================
router.get(
  "/",
  requireAuth,
  validate(fieldTypeQuerySchema),
  asyncHandler(async (req, res) => {
    const { fieldType } = req.query as { fieldType?: string };
    const filter = fieldType ? { fieldType } : {};
    const keywords = await KeywordLibraryModel.find(filter)
      .sort({ fieldType: 1, code: 1 })
      .lean();
    return sendSuccess(res, keywords);
  })
);

// ================================================================
// POST /api/keyword-library
// Thêm keyword mới vào kho (user-defined)
// ================================================================
router.post(
  "/",
  requireAuth,
  validate(addKeywordSchema),
  asyncHandler(async (req, res) => {
    const { fieldType, code, label, aliases } = req.body as {
      fieldType: (typeof keywordLibraryFieldTypes)[number];
      code: string;
      label: string;
      aliases?: string[];
    };

    const normalizedCode = code.trim().toUpperCase();

    // Check duplicate
    const existing = await KeywordLibraryModel.findOne({ fieldType, code: normalizedCode });
    if (existing) {
      throw errors.validation(`Mã "${normalizedCode}" đã tồn tại trong kho từ khóa cho trường "${fieldType}"`);
    }

    const keyword = await KeywordLibraryModel.create({
      fieldType,
      code: normalizedCode,
      label: label.trim(),
      aliases: (aliases || []).map((a) => a.trim().toUpperCase()).filter(Boolean),
      source: "user",
      addedBy: req.user!.id
    });

    return sendSuccess(res, keyword, 201);
  })
);

// ================================================================
// PUT /api/keyword-library/:id
// Cập nhật keyword (label/aliases)
// ================================================================
router.put(
  "/:id",
  requireAuth,
  validate(z.object({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
      label: z.string().min(1).max(100).optional(),
      aliases: z.array(z.string().max(30).toUpperCase()).optional()
    })
  })),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { label, aliases } = req.body as { label?: string; aliases?: string[] };

    const keyword = await KeywordLibraryModel.findById(id);
    if (!keyword) throw errors.notFound("Không tìm thấy từ khóa");

    if (label !== undefined) keyword.label = label.trim();
    if (aliases !== undefined) keyword.aliases = aliases.map((a) => a.trim().toUpperCase()).filter(Boolean);
    await keyword.save();

    return sendSuccess(res, keyword);
  })
);

// ================================================================
// DELETE /api/keyword-library/:id
// Xóa keyword (chỉ được xóa user-added, không xóa system)
// ================================================================
router.delete(
  "/:id",
  requireAuth,
  validate(keywordIdSchema),
  asyncHandler(async (req, res) => {
    const keyword = await KeywordLibraryModel.findById(req.params.id);
    if (!keyword) throw errors.notFound("Không tìm thấy từ khóa");
    if (keyword.source === "system") {
      throw errors.validation("Không thể xóa từ khóa hệ thống. Chỉ có thể xóa từ khóa do người dùng thêm.");
    }
    await keyword.deleteOne();
    return sendSuccess(res, { message: "Đã xóa từ khóa" });
  })
);

export default router;
