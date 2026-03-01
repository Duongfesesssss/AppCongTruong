import type { AnyBulkWriteOperation } from "mongoose";

import type { CmsTagScope } from "../lib/constants";
import { sanitizeText } from "../lib/utils";
import { CmsTagNameModel, type CmsTagNameDocument } from "./cms-tag-name.model";

type CmsTagSeed = {
  scope: CmsTagScope;
  code: string;
  label: string;
  aliases?: string[];
  description?: string;
};

const DEFAULT_CMS_TAG_SEEDS: CmsTagSeed[] = [
  { scope: "originator", code: "A79", label: "Đơn vị khởi tạo A79" },
  { scope: "originator", code: "SDE", label: "Đơn vị khởi tạo SDE" },
  { scope: "originator", code: "CON", label: "Đơn vị khởi tạo CON" },
  { scope: "originator", code: "EDE", label: "Edeka" },
  { scope: "originator", code: "BRL", label: "Bremer" },

  { scope: "discipline", code: "AA", aliases: ["AR"], label: "Kiến trúc (Architectural)" },
  { scope: "discipline", code: "ES", aliases: ["ST"], label: "Kết cấu (Structural)" },
  { scope: "discipline", code: "EM", aliases: ["ME"], label: "Cơ điện (Mechanical)" },
  { scope: "discipline", code: "EP", aliases: ["PL"], label: "Cấp thoát nước (Plumbing)" },
  { scope: "discipline", code: "EF", aliases: ["FP"], label: "PCCC (Fire Protection)" },
  { scope: "discipline", code: "EL", aliases: ["ELT"], label: "Điện (Electrical)" },
  { scope: "discipline", code: "HV", aliases: ["LUF"], label: "Thông gió điều hòa (HVAC/Luftung)" },
  { scope: "discipline", code: "IN", label: "Nội thất (Interior)" },
  { scope: "discipline", code: "LA", label: "Cảnh quan (Landscape)" },

  { scope: "building", code: "KS", label: "Khách sạn" },
  { scope: "building", code: "TM", label: "Trung tâm thương mại" },
  { scope: "building", code: "VP", label: "Văn phòng" },
  { scope: "building", code: "NT", label: "Nhà tập thể/Chung cư" },

  { scope: "volume", code: "BS", label: "Khối hầm (Basement)" },
  { scope: "volume", code: "PO", label: "Khối đế (Podium)" },
  { scope: "volume", code: "TY", label: "Khối tháp điển hình (Typical)" },
  { scope: "volume", code: "XO", label: "Toàn khu (Overall)" },

  { scope: "level", code: "RF", aliases: ["DG", "DA"], label: "Tầng mái (Roof/Dachgeschoss)" },
  { scope: "level", code: "EG", aliases: ["GF", "L1"], label: "Tầng trệt/Tầng 1" },
  { scope: "level", code: "UG", aliases: ["B1"], label: "Tầng hầm (Untergeschoss)" },
  { scope: "level", code: "OG1", label: "Tầng lầu 1 (OG1)" },
  { scope: "level", code: "OG2", label: "Tầng lầu 2 (OG2)" },
  { scope: "level", code: "OG3", label: "Tầng lầu 3 (OG3)" },
  { scope: "level", code: "B2", label: "Tầng hầm 2" },
  { scope: "level", code: "B3", label: "Tầng hầm 3" },
  { scope: "level", code: "L2", label: "Tầng 2" },
  { scope: "level", code: "L3", label: "Tầng 3" },
  { scope: "level", code: "MZ", aliases: ["MEZ"], label: "Tầng lửng (Mezzanine)" },
  { scope: "level", code: "ZZ", label: "Tất cả các tầng" },

  { scope: "zone", code: "GR", aliases: ["GRU"], label: "Mặt bằng tổng thể (Grundriss)" },
  { scope: "zone", code: "SE", aliases: ["ST"], label: "Mặt cắt (Section/Schnitt)" },
  { scope: "zone", code: "AN", aliases: ["AS"], label: "Mặt đứng (Elevation/Ansicht)" },
  { scope: "zone", code: "XO", aliases: ["ZZ"], label: "Toàn khu/Không phân vùng" },
  { scope: "zone", code: "SH", label: "Nhà kho/Nhà xưởng (Shed/Hall)" },

  { scope: "room", code: "WC", aliases: ["SAN"], label: "Khu vệ sinh (Sanitary)" },
  { scope: "room", code: "ST", aliases: ["STR"], label: "Cầu thang (Staircase)" },
  { scope: "room", code: "TE", aliases: ["TH"], label: "Phòng kỹ thuật (Technik)" },
  { scope: "room", code: "KT", aliases: ["KI"], label: "Nhà bếp (Kitchen/Kuche)" },
  { scope: "room", code: "OFF", aliases: ["BU"], label: "Văn phòng (Office/Buro)" },
  { scope: "room", code: "COR", aliases: ["FL"], label: "Hành lang (Corridor/Flur)" },

  { scope: "content_type", code: "SM", aliases: ["SC", "SCH"], label: "Sơ đồ nguyên lý (Schema)" },
  { scope: "content_type", code: "DT", aliases: ["DET"], label: "Bản vẽ chi tiết (Detail)" },
  { scope: "content_type", code: "IS", aliases: ["ISO"], label: "Bản vẽ trục đo axonometric/isometric" },
  { scope: "content_type", code: "KP", label: "Knotenpunkt/Connection detail" },

  { scope: "issue_status", code: "A", aliases: ["AP"], label: "Đã phê duyệt (Approved)" },
  { scope: "issue_status", code: "C", aliases: ["CO", "KOR"], label: "Đã chỉnh sửa (Corrected/Korrigiert)" },
  { scope: "issue_status", code: "T", aliases: ["TE", "TEST"], label: "Bản vẽ thử nghiệm/khảo sát" },

  { scope: "file_type", code: "M2", label: "Bản vẽ 2D" },
  { scope: "file_type", code: "M3", label: "Mô hình 3D" },
  { scope: "file_type", code: "DR", label: "Drawing" },
  { scope: "file_type", code: "SH", label: "Schedule" },

  {
    scope: "grid_axis",
    code: "AXIS",
    aliases: ["A_H", "1_10"],
    label: "Trục tọa độ bản vẽ",
    description: "Dùng cho các trường hợp ghi trục A-H hoặc 1-10"
  }
];

const normalizeCode = (value: string) => {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, "")
    .replace(/^-+|-+$/g, "");
};

const normalizeAliases = (values?: string[]) => {
  const unique = new Set<string>();
  (values || []).forEach((value) => {
    const normalized = normalizeCode(value);
    if (normalized) unique.add(normalized);
  });
  return Array.from(unique);
};

const toBulkOperation = (seed: CmsTagSeed, actorUserId?: string): AnyBulkWriteOperation<CmsTagNameDocument> | null => {
  const code = normalizeCode(seed.code);
  if (!code) return null;

  const aliases = normalizeAliases(seed.aliases).filter((alias) => alias !== code);
  const safeLabel = sanitizeText(seed.label).trim();
  if (!safeLabel) return null;
  const safeDescription = seed.description ? sanitizeText(seed.description).trim() : undefined;

  const update: Record<string, unknown> = {
    $setOnInsert: {
      scope: seed.scope,
      code,
      label: safeLabel,
      description: safeDescription || undefined,
      isActive: true,
      createdBy: actorUserId,
      updatedBy: actorUserId
    }
  };

  if (aliases.length > 0) {
    update.$addToSet = {
      aliases: { $each: aliases }
    };
  }

  return {
    updateOne: {
      filter: { scope: seed.scope, code },
      update,
      upsert: true
    }
  };
};

let ensureDefaultTagsPromise: Promise<void> | null = null;

export const ensureDefaultCmsTagNames = async (actorUserId?: string) => {
  if (ensureDefaultTagsPromise) return ensureDefaultTagsPromise;

  ensureDefaultTagsPromise = (async () => {
    const operations = DEFAULT_CMS_TAG_SEEDS.map((seed) => toBulkOperation(seed, actorUserId)).filter(
      (item): item is AnyBulkWriteOperation<CmsTagNameDocument> => !!item
    );

    if (operations.length === 0) return;
    await CmsTagNameModel.bulkWrite(operations, { ordered: false });
  })().finally(() => {
    ensureDefaultTagsPromise = null;
  });

  return ensureDefaultTagsPromise;
};

export const getDefaultCmsTagSeedCount = () => DEFAULT_CMS_TAG_SEEDS.length;
