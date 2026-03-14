import path from "node:path";
import fs from "node:fs";

import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { ProjectModel } from "../projects/project.model";
import { buildProjectAccessFilter, ensureProjectRole, canDeleteResource } from "../projects/project-access";
import { createDrawingSchema, drawingIdSchema, listDrawingSchema } from "./drawing.schema";
import { DrawingModel } from "./drawing.model";
import { parseDrawingFilename, parseDrawingMetadataFromText } from "./filename-parser";
import { createUploader, handleFileUpload } from "../lib/uploads";
import { config } from "../lib/config";
import { uploadLimiter } from "../middlewares/rate-limit";
import { sanitizeText } from "../lib/utils";
import { ZoneModel } from "../zones/zone.model";
import { deleteFromS3, getS3Stream } from "../lib/s3";
import { BuildingModel } from "../buildings/building.model";
import { FloorModel } from "../floors/floor.model";
import { DisciplineModel } from "../disciplines/discipline.model";
import { validateIfcFile, validateIfcFilePath } from "./ifc-validator";
import { linkDrawingsSchema, unlinkDrawingSchema } from "./drawing.schema";
import { Types } from "mongoose";

const router = Router();

// Separate uploaders for PDF and IFC files
const uploadPdf = createUploader({
  subDir: "drawings",
  allowedMime: ["application/pdf"],
  maxMb: config.uploadMaxPdfMb
});

const uploadIfc = createUploader({
  subDir: "drawings",
  allowedMime: [
    "application/x-step",
    "application/ifc",
    "model/ifc",
    "text/ifc",
    "text/plain", // IFC files are text-based
    "application/octet-stream" // Windows browsers often send .ifc as octet-stream
  ],
  maxMb: config.uploadMaxIfcMb
});

// Legacy support - use uploadPdf for existing endpoint
const upload = uploadPdf;

const getLocalDrawingPath = (storageKey: string) => {
  const safeKey = path.basename(storageKey);
  const localPath = path.join(process.cwd(), "uploads", "drawings", safeKey);
  if (fs.existsSync(localPath)) return localPath;
  return path.join(process.cwd(), "server", "uploads", "drawings", safeKey);
};

const isS3KeyNotFoundError = (err: unknown) => {
  const value = err as { name?: string; message?: string };
  const name = value?.name ?? "";
  const message = value?.message ?? "";
  return (
    name === "NoSuchKey" ||
    name === "NotFound" ||
    message.includes("NoSuchKey") ||
    message.includes("NotFound") ||
    message.includes("specified key does not exist")
  );
};

const getDrawingS3StreamWithFallback = async (storageKey: string) => {
  const safeKey = path.basename(storageKey);
  const candidateKeys = storageKey.startsWith("drawings/")
    ? [storageKey, safeKey]
    : [storageKey, `drawings/${safeKey}`];

  for (const key of candidateKeys) {
    try {
      return await getS3Stream(key);
    } catch (err) {
      if (isS3KeyNotFoundError(err)) {
        continue;
      }
      throw err;
    }
  }

  throw errors.notFound("File khong ton tai");
};

const getNextSortIndex = async (model: any, filter: Record<string, unknown>) => {
  const lastItem = await model
    .findOne(filter)
    .sort({ sortIndex: -1, createdAt: -1 })
    .select("sortIndex")
    .lean();
  return (lastItem?.sortIndex ?? 0) + 1;
};

const normalizeTagName = (value: string) => {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9.:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const normalizeConventionFieldTypeForTags = (type: string) => {
  const raw = String(type || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "projectprefix") return "project";
  if (lower === "drawingtype") return "content_type";
  return raw;
};

const toTagFieldType = (key: string) => {
  const normalized = normalizeConventionFieldTypeForTags(key);
  const lower = normalized.toLowerCase();

  const map: Record<string, string> = {
    projectcode: "project",
    buildingcode: "building",
    levelcode: "level",
    floorcode: "floor",
    disciplinecode: "discipline",
    drawingtypecode: "content_type",
    numbercode: "runningNumber",
    freetext: "description",
    unitcode: "originator",
    buildingpartcode: "volume",
    filetypecode: "file_type"
  };

  return map[lower] || normalized;
};

const buildTagNamesFromParsedMetadataInput = (input?: Record<string, string | undefined>) => {
  if (!input) return [];
  const tags: string[] = [];

  Object.entries(input).forEach(([rawKey, rawValue]) => {
    const value = sanitizeText(rawValue || "");
    if (!value) return;

    const fieldType = toTagFieldType(rawKey);
    if (!fieldType) return;

    tags.push(`${fieldType}:${value}`);
  });

  return mergeTagNames(tags);
};

const buildTagNamesFromParsedFields = (
  fields?: Array<{ type: string; value: string; matchedKeyword?: { code: string } }>
) => {
  if (!fields || !fields.length) return [];
  const tags: string[] = [];

  fields.forEach((field) => {
    const fieldType = toTagFieldType(field.type);
    if (!fieldType) return;
    const value = sanitizeText(field.matchedKeyword?.code || field.value || "");
    if (!value) return;
    tags.push(`${fieldType}:${value}`);
  });

  return mergeTagNames(tags);
};

const isUsableFilterOptionValue = (value: string) => {
  const text = String(value || "").trim();
  if (!text) return false;
  const normalized = text.toLowerCase();
  if (["_", "-", ".", "n/a", "na", "null", "undefined"].includes(normalized)) return false;
  return true;
};

const mergeTagNames = (...groups: Array<string[] | undefined>) => {
  const unique = new Set<string>();
  groups.forEach((group) => {
    (group || []).forEach((rawTag) => {
      const normalized = normalizeTagName(rawTag);
      if (normalized) unique.add(normalized);
    });
  });
  return Array.from(unique);
};

const normalizeDrawingCode = (value: string) => {
  return sanitizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeCodeSegment = (value: string) => {
  return sanitizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
};

const normalizeFloorSegment = (value: string) => {
  const raw = normalizeCodeSegment(value);
  const flMatch = raw.match(/^FL(\d{1,2})$/);
  if (flMatch) return `FL${flMatch[1].padStart(2, "0")}`;

  const lMatch = raw.match(/^L(\d{1,2})$/);
  if (lMatch) return `FL${lMatch[1].padStart(2, "0")}`;

  const numericMatch = raw.match(/^(\d{1,2})$/);
  if (numericMatch) return `FL${numericMatch[1].padStart(2, "0")}`;

  return raw;
};

const normalizeComparableCode = (value?: string) => {
  const normalized = normalizeCodeSegment(value || "");
  if (!normalized) return "";
  if (/^\d+$/.test(normalized)) {
    return String(Number(normalized));
  }
  return normalized;
};

const normalizeComparableFloorCode = (value?: string) => {
  const normalized = normalizeCodeSegment(value || "");
  if (!normalized) return "";

  const levelMatch = normalized.match(/^L(\d+)$/);
  if (levelMatch) return `N${Number(levelMatch[1])}`;

  const floorMatch = normalized.match(/^FL(\d+)$/);
  if (floorMatch) return `N${Number(floorMatch[1])}`;

  const numericMatch = normalized.match(/^(\d+)$/);
  if (numericMatch) return `N${Number(numericMatch[1])}`;

  const basementMatch = normalized.match(/^B(\d+)$/);
  if (basementMatch) return `B${Number(basementMatch[1])}`;

  const ogMatch = normalized.match(/^OG(\d+)$/);
  if (ogMatch) return `OG${Number(ogMatch[1])}`;

  if (normalized === "UG" || normalized === "EG" || normalized === "RF" || normalized === "ZZ") {
    return normalized;
  }

  return normalized;
};

const isEquivalentCode = (left?: string, right?: string) => {
  const normalizedLeft = normalizeComparableCode(left);
  const normalizedRight = normalizeComparableCode(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight;
};

const isEquivalentFloorCode = (left?: string, right?: string) => {
  const normalizedLeft = normalizeComparableFloorCode(left);
  const normalizedRight = normalizeComparableFloorCode(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight;
};

const buildDrawingCodeBase = (buildingCode: string, floorCode: string, disciplineCode: string) => {
  const building = normalizeCodeSegment(buildingCode);
  const floor = normalizeFloorSegment(floorCode);
  const discipline = normalizeCodeSegment(disciplineCode);
  if (!building || !floor || !discipline) return "";
  return `${building}-${floor}-${discipline}`;
};

const buildAutoDrawingCode = async ({
  projectId,
  buildingCode,
  floorCode,
  disciplineCode
}: {
  projectId: string;
  buildingCode: string;
  floorCode: string;
  disciplineCode: string;
}) => {
  const codeBase = buildDrawingCodeBase(buildingCode, floorCode, disciplineCode);
  if (!codeBase) return "";

  const codePattern = new RegExp(`^${escapeRegex(codeBase)}-(\\d{3})$`);
  const existingCodes = await DrawingModel.find({
    projectId,
    drawingCode: { $regex: `^${escapeRegex(codeBase)}-\\d{3}$` }
  })
    .select("drawingCode")
    .lean();

  let maxSequence = 0;
  existingCodes.forEach((item) => {
    const match = String(item.drawingCode || "").toUpperCase().match(codePattern);
    if (!match) return;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > maxSequence) {
      maxSequence = value;
    }
  });

  return `${codeBase}-${String(maxSequence + 1).padStart(3, "0")}`;
};

const buildStandardizedDrawingFileName = (drawingCode: string, mimeType: string, fallbackOriginalName: string) => {
  const safeCode =
    drawingCode
      .toUpperCase()
      .replace(/[^A-Z0-9.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "DRAWING";

  if (mimeType === "application/pdf") {
    return `${safeCode}.pdf`;
  }

  const ext = path.extname(fallbackOriginalName || "").toLowerCase();
  const normalizedExt = ext ? ext.replace(/[^a-z0-9.]/g, "") : ".bin";
  return `${safeCode}${normalizedExt || ".bin"}`;
};

const resolveAutoScan = async ({
  originalName,
  preferredName,
  ocrText,
  projectId
}: {
  originalName: string;
  preferredName?: string;
  ocrText?: string;
  projectId: string;
}) => {
  // Legacy parser là nguồn chính, không phụ thuộc naming convention.
  const parsedFromPreferredName = preferredName ? parseDrawingFilename(preferredName) : null;
  if (parsedFromPreferredName) {
    return { parsed: parsedFromPreferredName, flexibleParsed: null, metadata: null, source: "manual" as const };
  }

  const parsedFromFilename = parseDrawingFilename(originalName);
  if (parsedFromFilename) {
    return { parsed: parsedFromFilename, flexibleParsed: null, metadata: null, source: "filename" as const };
  }

  const parsedFromOcr = ocrText ? parseDrawingMetadataFromText(ocrText) : null;
  if (parsedFromOcr) {
    return { parsed: parsedFromOcr, flexibleParsed: null, metadata: null, source: "ocr" as const };
  }

  return { parsed: null, flexibleParsed: null, metadata: null, source: "none" as const };
};

const pickFirstNonEmpty = (...values: Array<unknown>) => {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) return text;
  }
  return undefined;
};

const normalizeParsedMetadataInput = (
  input?: Record<string, string | undefined>
): {
  projectCode?: string;
  buildingCode?: string;
  levelCode?: string;
  disciplineCode?: string;
  drawingTypeCode?: string;
  numberCode?: string;
  freeText?: string;
  unitCode?: string;
  buildingPartCode?: string;
  floorCode?: string;
  fileTypeCode?: string;
} | undefined => {
  if (!input) return undefined;

  // pickCode: lấy giá trị đầu tiên không rỗng và chuẩn hóa thành uppercase (khớp với normalizeCodeSegment ở filter query)
  const pickCode = (...values: Array<string | undefined>) => {
    const raw = pickFirstNonEmpty(...values);
    return raw ? normalizeCodeSegment(raw) : undefined;
  };

  const normalized = {
    projectCode: pickCode(input.projectCode, input.project, input.projectPrefix),
    buildingCode: pickCode(input.buildingCode, input.building),
    levelCode: pickCode(input.levelCode, input.level, input.floor),
    disciplineCode: pickCode(input.disciplineCode, input.discipline),
    drawingTypeCode: pickCode(input.drawingTypeCode, input.content_type, input.drawingType),
    numberCode: pickCode(input.numberCode, input.runningNumber),
    freeText: pickFirstNonEmpty(input.freeText, input.description, input.room), // giữ nguyên, không chuẩn hóa
    unitCode: pickCode(input.unitCode, input.originator),
    buildingPartCode: pickCode(input.buildingPartCode, input.volume, input.zone),
    floorCode: pickCode(input.floorCode, input.floor, input.level),
    fileTypeCode: pickCode(input.fileTypeCode, input.file_type)
  };

  const hasAnyValue = Object.values(normalized).some((value) => !!value);
  return hasAnyValue ? normalized : undefined;
};

const mergeParsedMetadata = (
  ...sources: Array<
    | {
        projectCode?: string;
        buildingCode?: string;
        levelCode?: string;
        disciplineCode?: string;
        drawingTypeCode?: string;
        numberCode?: string;
        freeText?: string;
        unitCode?: string;
        buildingPartCode?: string;
        floorCode?: string;
        fileTypeCode?: string;
      }
    | undefined
  >
) => {
  const merged: Record<string, string> = {};
  const keys = [
    "projectCode",
    "buildingCode",
    "levelCode",
    "disciplineCode",
    "drawingTypeCode",
    "numberCode",
    "freeText",
    "unitCode",
    "buildingPartCode",
    "floorCode",
    "fileTypeCode"
  ];

  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = source[key as keyof typeof source];
      if (typeof value === "string" && value.trim() && !merged[key]) {
        merged[key] = value;
      }
    }
  }

  return Object.keys(merged).length > 0 ? (merged as typeof sources[number]) : undefined;
};

const extractHeuristicMetadataFromCode = (input?: string) => {
  const raw = sanitizeText(input || "").trim();
  if (!raw) return undefined;

  // Hỗ trợ cả tên dùng '_' và drawingCode dùng '-'
  const parts = raw
    .replace(/[_\s]+/g, "-")
    .split("-")
    .map((p) => p.trim())
    .filter(Boolean);

  // Mẫu phổ biến: H120029-83-H-XX-SAN-003-...
  if (parts.length < 6) return undefined;

  return normalizeParsedMetadataInput({
    disciplineCode: parts[1],
    projectCode: parts[2],
    buildingPartCode: parts[3],
    levelCode: parts[4],
    floorCode: parts[4],
    drawingTypeCode: parts[5]
  });
};

const hasMeaningfulParsedMetadata = (input?: Record<string, unknown>) => {
  if (!input) return false;
  const keys = [
    "projectCode",
    "buildingCode",
    "levelCode",
    "disciplineCode",
    "drawingTypeCode",
    "numberCode",
    "freeText",
    "unitCode",
    "buildingPartCode",
    "floorCode",
    "fileTypeCode"
  ];
  return keys.some((key) => {
    const value = input[key];
    return typeof value === "string" && value.trim().length > 0;
  });
};

const backfillDrawingParsedMetadataForProject = async (projectId: string) => {
  const drawings = await DrawingModel.find({
    projectId: new Types.ObjectId(projectId)
  })
    .select("_id originalName name drawingCode parsedMetadata tagNames")
    .lean();

  if (!drawings.length) return;

  const operations: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown> } }> = [];

  for (const drawing of drawings) {
    const sourceName = drawing.originalName || drawing.name || drawing.drawingCode;
    if (!sourceName) continue;

    const legacyParsed = parseDrawingFilename(sourceName) || (drawing.drawingCode ? parseDrawingFilename(drawing.drawingCode) : null);
    const heuristicMetadata =
      extractHeuristicMetadataFromCode(drawing.drawingCode) ||
      extractHeuristicMetadataFromCode(drawing.originalName || drawing.name);

    if (!legacyParsed && !heuristicMetadata) continue;

    const updateSet: Record<string, unknown> = {};

    const metadataFromLegacy = normalizeParsedMetadataInput(
      legacyParsed
        ? {
            projectCode: legacyParsed.projectCode,
            levelCode: legacyParsed.floorCode,
            disciplineCode: legacyParsed.disciplineCode,
            unitCode: legacyParsed.unitCode,
            buildingCode: legacyParsed.buildingCode,
            buildingPartCode: legacyParsed.buildingPartCode,
            floorCode: legacyParsed.floorCode,
            fileTypeCode: legacyParsed.fileTypeCode
          }
        : undefined
    );

    const metadata = mergeParsedMetadata(metadataFromLegacy, heuristicMetadata);
    // Luôn cập nhật parsedMetadata (kể cả khi đã có) để đảm bảo giá trị được chuẩn hóa (uppercase)
    if (metadata) {
      const existingMeta = JSON.stringify(drawing.parsedMetadata ?? {});
      const newMeta = JSON.stringify(metadata);
      if (existingMeta !== newMeta) {
        updateSet.parsedMetadata = metadata;
      }
    }

    const legacyTags = legacyParsed?.tagNames ?? [];
    const nextAutoTags = mergeTagNames(legacyTags);
    if (nextAutoTags.length > 0) {
      const mergedTags = mergeTagNames((drawing.tagNames as string[] | undefined) || [], nextAutoTags);
      const existingTags = Array.from(new Set(((drawing.tagNames as string[] | undefined) || []).slice().sort()));
      const nextTags = Array.from(new Set(mergedTags.slice().sort()));
      if (JSON.stringify(existingTags) !== JSON.stringify(nextTags)) {
        updateSet.tagNames = mergedTags;
      }
    }

    if (Object.keys(updateSet).length === 0) continue;

    operations.push({
      updateOne: {
        filter: { _id: drawing._id },
        update: { $set: updateSet }
      }
    });
  }

  if (operations.length > 0) {
    await DrawingModel.bulkWrite(operations, { ordered: false });
  }
};

router.post(
  "/",
  requireAuth,
  uploadLimiter,
  upload.single("file"),
  validate(createDrawingSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw errors.validation("Yeu cau file upload");
    }

    const {
      projectId,
      buildingId,
      floorId,
      disciplineId,
      drawingCode: drawingCodeInput,
      name,
      tagNames,
      ocrText,
      parsedMetadata: parsedMetadataInput
    } = req.body as {
      projectId: string;
      buildingId?: string;
      floorId?: string;
      disciplineId?: string;
      drawingCode?: string;
      name?: string;
      tagNames?: string[];
      ocrText?: string;
      parsedMetadata?: {
        projectCode?: string;
        buildingCode?: string;
        levelCode?: string;
        disciplineCode?: string;
        drawingTypeCode?: string;
        numberCode?: string;
        freeText?: string;
        project?: string;
        building?: string;
        level?: string;
        floor?: string;
        discipline?: string;
        content_type?: string;
        drawingType?: string;
        runningNumber?: string;
        description?: string;
        room?: string;
        originator?: string;
        volume?: string;
        zone?: string;
        file_type?: string;
        unitCode?: string;
        buildingPartCode?: string;
        floorCode?: string;
        fileTypeCode?: string;
        projectPrefix?: string;
      };
    };

    const normalizedParsedMetadataInput = normalizeParsedMetadataInput(parsedMetadataInput);

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "technician", "Project khong ton tai hoac khong co quyen");

    const preferredDrawingName = normalizeDrawingCode(drawingCodeInput || name || "");
    const autoScan = await resolveAutoScan({
      originalName: req.file.originalname,
      preferredName: preferredDrawingName || undefined,
      ocrText,
      projectId: project!._id.toString()
    });
    const parsed = autoScan.parsed;
    const heuristicUploadMetadata =
      extractHeuristicMetadataFromCode(preferredDrawingName) ||
      extractHeuristicMetadataFromCode(req.file.originalname) ||
      extractHeuristicMetadataFromCode(name);

    let resolvedBuildingId = buildingId;
    let resolvedFloorId = floorId;
    let resolvedDisciplineId = disciplineId;

    const findBuildingByParsedCode = async (code: string) => {
      const normalizedCode = normalizeCodeSegment(code);
      if (!normalizedCode) return null;
      const buildings = await BuildingModel.find({ projectId: project!._id }).select("_id code").lean();
      return buildings.find((item) => isEquivalentCode(item.code, normalizedCode)) || null;
    };

    const findFloorByParsedCode = async (code: string, buildingRefId?: string) => {
      const normalizedCode = normalizeCodeSegment(code);
      if (!normalizedCode) return null;
      const floorFilter: Record<string, unknown> = { projectId: project!._id };
      if (buildingRefId) {
        floorFilter.buildingId = buildingRefId;
      }
      const floors = await FloorModel.find(floorFilter).select("_id code buildingId").lean();
      return floors.find((item) => isEquivalentFloorCode(item.code, normalizedCode)) || null;
    };

    const findDisciplineByParsedCode = async (code: string, floorRefId?: string) => {
      const normalizedCode = normalizeCodeSegment(code);
      if (!normalizedCode) return null;
      const disciplineFilter: Record<string, unknown> = { projectId: project!._id };
      if (floorRefId) {
        disciplineFilter.floorId = floorRefId;
      }
      const disciplines = await DisciplineModel.find(disciplineFilter)
        .select("_id code floorId buildingId")
        .lean();
      return disciplines.find((item) => isEquivalentCode(item.code, normalizedCode)) || null;
    };

    if (!resolvedBuildingId && (parsed?.buildingCode || heuristicUploadMetadata?.buildingCode)) {
      const code = heuristicUploadMetadata?.buildingCode || parsed?.buildingCode;
      if (code) {
        const matchedBuilding = await findBuildingByParsedCode(code);
        if (matchedBuilding?._id) {
          resolvedBuildingId = matchedBuilding._id.toString();
        }
      }
    }

    if (!resolvedFloorId && (parsed?.floorCode || heuristicUploadMetadata?.levelCode)) {
      const code = heuristicUploadMetadata?.levelCode || parsed?.floorCode;
      if (code) {
        const matchedFloor = await findFloorByParsedCode(code, resolvedBuildingId);
        if (matchedFloor?._id) {
          resolvedFloorId = matchedFloor._id.toString();
          if (!resolvedBuildingId && matchedFloor.buildingId) {
            resolvedBuildingId = matchedFloor.buildingId.toString();
          }
        }
      }
    }

    if (!resolvedDisciplineId && (parsed?.disciplineCode || heuristicUploadMetadata?.disciplineCode)) {
      const code = heuristicUploadMetadata?.disciplineCode || parsed?.disciplineCode;
      if (code) {
        const matchedDiscipline = await findDisciplineByParsedCode(code, resolvedFloorId);
        if (matchedDiscipline?._id) {
          resolvedDisciplineId = matchedDiscipline._id.toString();
          if (!resolvedFloorId && matchedDiscipline.floorId) {
            resolvedFloorId = matchedDiscipline.floorId.toString();
          }
          if (!resolvedBuildingId && matchedDiscipline.buildingId) {
            resolvedBuildingId = matchedDiscipline.buildingId.toString();
          }
        }
      }
    }

    let building = resolvedBuildingId ? await BuildingModel.findById(resolvedBuildingId) : null;
    if (building && building.projectId.toString() !== project!._id.toString()) {
      throw errors.validation("Toa nha khong thuoc project da chon");
    }

    let floor = resolvedFloorId ? await FloorModel.findById(resolvedFloorId) : null;
    if (floor && floor.projectId.toString() !== project!._id.toString()) {
      throw errors.validation("Tang khong thuoc project da chon");
    }
    if (floor && building && floor.buildingId.toString() !== building._id.toString()) {
      throw errors.validation("Tang khong thuoc toa nha da chon");
    }
    if (floor && !building) {
      building = await BuildingModel.findById(floor.buildingId);
      resolvedBuildingId = floor.buildingId.toString();
    }

    let discipline = resolvedDisciplineId ? await DisciplineModel.findById(resolvedDisciplineId) : null;
    if (discipline && discipline.projectId.toString() !== project!._id.toString()) {
      throw errors.validation("Bo mon khong thuoc project da chon");
    }
    if (discipline && floor && discipline.floorId.toString() !== floor._id.toString()) {
      throw errors.validation("Bo mon khong thuoc tang da chon");
    }
    if (discipline && !floor) {
      floor = await FloorModel.findById(discipline.floorId);
      resolvedFloorId = discipline.floorId.toString();
    }
    if (discipline && !building) {
      building = await BuildingModel.findById(discipline.buildingId);
      resolvedBuildingId = discipline.buildingId.toString();
    }
    if (discipline && building && discipline.buildingId.toString() !== building._id.toString()) {
      throw errors.validation("Bo mon khong thuoc toa nha da chon");
    }

    if (!building && (parsed?.buildingCode || heuristicUploadMetadata?.buildingCode)) {
      const code = heuristicUploadMetadata?.buildingCode || parsed?.buildingCode;
      if (code) {
        const sortIndex = await getNextSortIndex(BuildingModel, { projectId: project!._id });
        building = await BuildingModel.create({
          projectId: project!._id,
          name: sanitizeText(code),
          code: normalizeCodeSegment(code),
          sortIndex
        });
        resolvedBuildingId = building._id.toString();
      }
    }

    if (!floor && (parsed?.floorCode || heuristicUploadMetadata?.levelCode) && building) {
      const code = heuristicUploadMetadata?.levelCode || parsed?.floorCode;
      if (code) {
        const sortIndex = await getNextSortIndex(FloorModel, { buildingId: building._id });
        floor = await FloorModel.create({
          projectId: project!._id,
          buildingId: building._id,
          name: sanitizeText(code),
          code: normalizeCodeSegment(code),
          sortIndex
        });
        resolvedFloorId = floor._id.toString();
      }
    }

    if (!discipline && (parsed?.disciplineCode || heuristicUploadMetadata?.disciplineCode) && floor && building) {
      const code = heuristicUploadMetadata?.disciplineCode || parsed?.disciplineCode;
      if (code) {
        const sortIndex = await getNextSortIndex(DisciplineModel, { floorId: floor._id });
        discipline = await DisciplineModel.create({
          projectId: project!._id,
          buildingId: building._id,
          floorId: floor._id,
          name: sanitizeText(code),
          code: normalizeCodeSegment(code),
          sortIndex
        });
        resolvedDisciplineId = discipline._id.toString();
      }
    }

    // Floor and discipline are optional in the new metadata-driven system
    // Only throw if explicitly provided but invalid

    const normalizedDrawingCode = drawingCodeInput ? normalizeDrawingCode(drawingCodeInput) : "";
    let drawingCode = normalizedDrawingCode || parsed?.drawingCode || "";
    if (!drawingCode && building && floor && discipline) {
      drawingCode = await buildAutoDrawingCode({
        projectId: project!._id.toString(),
        buildingCode: building.code,
        floorCode: floor.code,
        disciplineCode: discipline.code
      });
    }
    if (!drawingCode) {
      throw errors.validation("Khong doc duoc ma ban ve. Vui long nhap ma ban ve");
    }
    const standardizedFileName = buildStandardizedDrawingFileName(
      drawingCode,
      req.file.mimetype,
      req.file.originalname
    );

    // Handle file upload (S3 or local)
    const storageKey = await handleFileUpload(req.file, "drawings");

    const fallbackName = parsed?.suggestedName || drawingCode || path.parse(req.file.originalname).name;
    const safeNameRaw = sanitizeText(name?.trim() ? name : fallbackName);
    const safeName = safeNameRaw || "Drawing";
    const conventionFieldTags = parsedMetadataInput
      ? buildTagNamesFromParsedMetadataInput(parsedMetadataInput as Record<string, string | undefined>)
      : [];
    const mergedTags = mergeTagNames(
      parsed?.tagNames,
      conventionFieldTags,
      [
        building ? `building:${building.code}` : undefined,
        floor ? `floor:${floor.code}` : undefined,
        discipline ? `discipline:${discipline.code}` : undefined,
        !parsed ? "uncategorized" : undefined
      ].filter((tag): tag is string => !!tag),
      tagNames
    );

    const latestVersion = await DrawingModel.findOne({
      projectId: project!._id,
      drawingCode
    })
      .sort({ versionIndex: -1, createdAt: -1 })
      .select("versionIndex sortIndex")
      .lean();

    const versionIndex = (latestVersion?.versionIndex ?? 0) + 1;
    const sortIndex =
      latestVersion?.sortIndex ??
      (await getNextSortIndex(DrawingModel, {
        projectId: project!._id,
        isLatestVersion: true
      }));

    await DrawingModel.updateMany(
      {
        projectId: project!._id,
        drawingCode,
        isLatestVersion: true
      },
      { $set: { isLatestVersion: false } }
    );

    const parsedMetadataFromLegacy = parsed
      ? normalizeParsedMetadataInput({
          projectCode: parsed.projectCode,
          unitCode: parsed.unitCode,
          disciplineCode: parsed.disciplineCode,
          buildingCode: parsed.buildingCode,
          buildingPartCode: parsed.buildingPartCode,
          floorCode: parsed.floorCode,
          fileTypeCode: parsed.fileTypeCode
        })
      : undefined;

    const mergedCreationMetadata = mergeParsedMetadata(
      normalizedParsedMetadataInput,
      parsedMetadataFromLegacy,
      heuristicUploadMetadata
    );

    const drawing = await DrawingModel.create({
      projectId: project!._id,
      buildingId: resolvedBuildingId || undefined,
      floorId: resolvedFloorId || undefined,
      disciplineId: resolvedDisciplineId || undefined,
      name: safeName,
      drawingCode,
      versionIndex,
      isLatestVersion: true,
      parsedMetadata: mergedCreationMetadata,
      tagNames: mergedTags,
      sortIndex,
      originalName: standardizedFileName,
      storageKey,
      mimeType: req.file.mimetype,
      size: req.file.size,
      createdBy: req.user!.id
    });

    return sendSuccess(
      res,
      {
        ...drawing.toObject(),
        autoScan: {
          source: autoScan.source,
          matched: !!parsed,
          suggestedName: parsed?.suggestedName,
          parsedMetadata: parsed
            ? {
                projectCode: parsed.projectCode,
                unitCode: parsed.unitCode,
                disciplineCode: parsed.disciplineCode,
                buildingCode: parsed.buildingCode,
                buildingPartCode: parsed.buildingPartCode,
                floorCode: parsed.floorCode,
                fileTypeCode: parsed.fileTypeCode
              }
              : undefined,
          namingConvention: undefined
        }
      },
      {},
      201
    );
  })
);

router.get(
  "/",
  requireAuth,
  validate(listDrawingSchema),
  asyncHandler(async (req, res) => {
    const userProjects = await ProjectModel.find(buildProjectAccessFilter(req.user!.id)).select("_id");
    const projectIds = userProjects.map((p) => p._id);
    const projectIdSet = new Set(projectIds.map((item) => item.toString()));
    const includeVersions = req.query.includeVersions as boolean | undefined;

    const filter: Record<string, unknown> = { projectId: { $in: projectIds } };
    if (req.query.projectId) {
      const requestedProjectId = String(req.query.projectId);
      if (!projectIdSet.has(requestedProjectId)) return sendSuccess(res, []);
      filter.projectId = requestedProjectId;
    }

    const requestedTagNames = [
      ...(req.query.tagName ? [req.query.tagName] : []),
      ...(req.query.tagNames ? (Array.isArray(req.query.tagNames) ? req.query.tagNames : [req.query.tagNames]) : [])
    ]
      .map((tag) => normalizeTagName(String(tag)))
      .filter(Boolean);

    if (requestedTagNames.length > 0) {
      // Với các prefix chuẩn từ naming-convention, lọc theo parsedMetadata để tránh sai do tag cũ.
      // Chỉ fallback sang tagNames cho các prefix không biết trước.
      const knownPrefixToMetaKey: Record<string, string> = {
        project: "parsedMetadata.projectCode",
        building: "parsedMetadata.buildingCode",
        level: "parsedMetadata.levelCode",
        floor: "parsedMetadata.floorCode",
        discipline: "parsedMetadata.disciplineCode",
        content_type: "parsedMetadata.drawingTypeCode",
        runningnumber: "parsedMetadata.numberCode",
        originator: "parsedMetadata.unitCode",
        volume: "parsedMetadata.buildingPartCode",
        zone: "parsedMetadata.buildingPartCode",
        file_type: "parsedMetadata.fileTypeCode"
      };

      const knownValueGroups = new Map<string, string[]>();
      const unknownTagGroups = new Map<string, string[]>();

      requestedTagNames.forEach((tag) => {
        const colonIndex = tag.indexOf(":");
        if (colonIndex <= 0) {
          const list = unknownTagGroups.get("__plain__") ?? [];
          list.push(tag);
          unknownTagGroups.set("__plain__", list);
          return;
        }

        const prefix = tag.slice(0, colonIndex);
        const value = tag.slice(colonIndex + 1);
        if (!value) return;

        if (knownPrefixToMetaKey[prefix]) {
          const list = knownValueGroups.get(prefix) ?? [];
          list.push(value);
          knownValueGroups.set(prefix, list);
        } else {
          const list = unknownTagGroups.get(prefix) ?? [];
          list.push(tag);
          unknownTagGroups.set(prefix, list);
        }
      });

      const andConditions: Array<Record<string, unknown>> = [];

      knownValueGroups.forEach((values, prefix) => {
        const dbKey = knownPrefixToMetaKey[prefix];
        const normalizedValues = values.map((value) => normalizeCodeSegment(value)).filter(Boolean);
        if (normalizedValues.length > 0) {
          andConditions.push({ [dbKey]: { $in: normalizedValues } });
        }
      });

      unknownTagGroups.forEach((group) => {
        if (group.length > 0) {
          andConditions.push({ tagNames: { $in: group } });
        }
      });

      if (andConditions.length === 1) {
        Object.assign(filter, andConditions[0]);
      } else if (andConditions.length > 1) {
        const existingAnd = (filter.$and as Array<Record<string, unknown>> | undefined) ?? [];
        filter.$and = [...existingAnd, ...andConditions];
      }
    }

    // Multi-select filters for building/floor/discipline
    if (req.query.buildingIds) {
      const buildingIds = Array.isArray(req.query.buildingIds) ? req.query.buildingIds : [req.query.buildingIds];
      if (buildingIds.length > 0) {
        filter.buildingId = { $in: buildingIds };
      }
    }

    if (req.query.floorIds) {
      const floorIds = Array.isArray(req.query.floorIds) ? req.query.floorIds : [req.query.floorIds];
      if (floorIds.length > 0) {
        filter.floorId = { $in: floorIds };
      }
    }

    if (req.query.disciplineIds) {
      const disciplineIds = Array.isArray(req.query.disciplineIds) ? req.query.disciplineIds : [req.query.disciplineIds];
      if (disciplineIds.length > 0) {
        filter.disciplineId = { $in: disciplineIds };
      }
    }

    // Filter by parsed metadata codes
    if (req.query.levelCodes) {
      const levelCodes = Array.isArray(req.query.levelCodes) ? req.query.levelCodes : [req.query.levelCodes];
      if (levelCodes.length > 0) {
        // Normalize and match level codes
        const normalizedCodes = levelCodes.map((code) => normalizeCodeSegment(String(code)));
        filter["parsedMetadata.levelCode"] = {
          $in: normalizedCodes.filter(Boolean)
        };
      }
    }

    if (req.query.buildingCodes) {
      const buildingCodes = Array.isArray(req.query.buildingCodes) ? req.query.buildingCodes : [req.query.buildingCodes];
      if (buildingCodes.length > 0) {
        const normalizedCodes = buildingCodes.map((code) => normalizeCodeSegment(String(code)));
        filter["parsedMetadata.buildingCode"] = {
          $in: normalizedCodes.filter(Boolean)
        };
      }
    }

    if (req.query.disciplineCodes) {
      const disciplineCodes = Array.isArray(req.query.disciplineCodes) ? req.query.disciplineCodes : [req.query.disciplineCodes];
      if (disciplineCodes.length > 0) {
        const normalizedCodes = disciplineCodes.map((code) => normalizeCodeSegment(String(code)));
        filter["parsedMetadata.disciplineCode"] = {
          $in: normalizedCodes.filter(Boolean)
        };
      }
    }

    if (req.query.drawingTypeCodes) {
      const drawingTypeCodes = Array.isArray(req.query.drawingTypeCodes) ? req.query.drawingTypeCodes : [req.query.drawingTypeCodes];
      if (drawingTypeCodes.length > 0) {
        const normalizedCodes = drawingTypeCodes.map((code) => normalizeCodeSegment(String(code)));
        filter["parsedMetadata.drawingTypeCode"] = { $in: normalizedCodes.filter(Boolean) };
      }
    }

    if (req.query.numberCodes) {
      const numberCodes = Array.isArray(req.query.numberCodes) ? req.query.numberCodes : [req.query.numberCodes];
      if (numberCodes.length > 0) {
        const normalizedCodes = numberCodes.map((code) => normalizeCodeSegment(String(code)));
        filter["parsedMetadata.numberCode"] = { $in: normalizedCodes.filter(Boolean) };
      }
    }

    if (req.query.projectCodes) {
      const projectCodes = Array.isArray(req.query.projectCodes) ? req.query.projectCodes : [req.query.projectCodes];
      if (projectCodes.length > 0) {
        const normalizedCodes = projectCodes.map((code) => normalizeCodeSegment(String(code)));
        filter["parsedMetadata.projectCode"] = { $in: normalizedCodes.filter(Boolean) };
      }
    }

    // Filter by phase/stage (if the field exists in parsedMetadata or will be added)
    if (req.query.phases) {
      const phases = Array.isArray(req.query.phases) ? req.query.phases : [req.query.phases];
      if (phases.length > 0) {
        // Assuming phase might be stored in freeText or a dedicated field
        filter["parsedMetadata.freeText"] = {
          $in: phases.map((p) => String(p).trim().toUpperCase())
        };
      }
    }

    // Filter by file type
    if (req.query.fileType) {
      filter.fileType = req.query.fileType;
    }

    if (!includeVersions) {
      filter.$or = [{ isLatestVersion: true }, { isLatestVersion: { $exists: false } }];
    }

    const drawings = await DrawingModel.find(filter).sort({
      sortIndex: 1,
      versionIndex: -1,
      createdAt: -1
    });
    return sendSuccess(res, drawings);
  })
);

// Map convention field types → parsedMetadata db keys → API query param names
const FIELD_TYPE_TO_META_KEY: Record<string, string> = {
  building: "parsedMetadata.buildingCode",
  level: "parsedMetadata.levelCode",
  discipline: "parsedMetadata.disciplineCode",
  content_type: "parsedMetadata.drawingTypeCode",
  runningNumber: "parsedMetadata.numberCode",
  description: "parsedMetadata.freeText",
  project: "parsedMetadata.projectCode",
  originator: "parsedMetadata.unitCode",
  volume: "parsedMetadata.buildingPartCode",
  zone: "parsedMetadata.buildingPartCode",
  floor: "parsedMetadata.floorCode",
  file_type: "parsedMetadata.fileTypeCode",
};

const FALLBACK_FILTER_LABELS: Record<string, string> = {
  project: "Project",
  building: "Building",
  level: "Level",
  floor: "Floor",
  discipline: "Discipline",
  content_type: "Content type",
  runningNumber: "Running number",
  originator: "Originator",
  volume: "Volume",
  zone: "Zone",
  file_type: "File type"
};

const DEFAULT_FILTER_FIELD_TYPES = [
  "project",
  "building",
  "level",
  "discipline",
  "content_type",
  "runningNumber",
  "originator",
  "volume",
  "zone",
  "floor",
  "file_type"
];

const normalizeConventionFieldType = (type: string) => normalizeConventionFieldTypeForTags(type);

router.get(
  "/filter-options",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    if (!projectId || typeof projectId !== "string") {
      return res.status(400).json({ error: "projectId required" });
    }

    // Verify user has access to this project
    const userProjects = await ProjectModel.find(buildProjectAccessFilter(req.user!.id)).select("_id");
    const hasAccess = userProjects.some((p) => p._id.toString() === projectId);
    if (!hasAccess) return sendSuccess(res, []);

    // Backfill metadata cho các bản vẽ cũ chưa có parsedMetadata để bộ lọc dùng được ngay.
    await backfillDrawingParsedMetadataForProject(projectId);

    // Không dùng naming convention để quyết định cột filter.
    // Luôn dựa trên metadata thực tế để project mới/không setup vẫn có đủ cột.
    const fields = DEFAULT_FILTER_FIELD_TYPES.map((type, index) => ({
      type,
      order: index,
      label: FALLBACK_FILTER_LABELS[type] || type,
      enabled: true
    }));

    const baseFilter = {
      projectId: new Types.ObjectId(projectId),
      $or: [{ isLatestVersion: true }, { isLatestVersion: { $exists: false } }]
    };

    // Get distinct values for each enabled convention field
    const results = await Promise.all(
      fields.map(async (field) => {
        const dbKey = FIELD_TYPE_TO_META_KEY[field.type];
        if (!dbKey) return null;

        const values: string[] = await DrawingModel.distinct(dbKey, {
          ...baseFilter,
          [dbKey]: { $exists: true, $ne: "" }
        });

        const options = values
          .map((value) => String(value).trim())
          .filter(isUsableFilterOptionValue)
          .sort();
        return {
          type: field.type,
          label: field.label || field.type,
          dbKey,
          options,
          values: options
        };
      })
    );

    // Fallback: nếu convention chưa khai báo đủ field, vẫn sinh filter từ dữ liệu parsedMetadata hiện có
    const existingTypes = new Set(results.filter((r) => !!r).map((r) => r!.type));
    const existingDbKeys = new Set(results.filter((r) => !!r).map((r) => r!.dbKey));
    const fallbackCandidates = Object.entries(FIELD_TYPE_TO_META_KEY)
      .filter(([type, dbKey]) => type !== "description" && !existingTypes.has(type) && !existingDbKeys.has(dbKey));

    for (const [type, dbKey] of fallbackCandidates) {
      const values: string[] = await DrawingModel.distinct(dbKey, {
        ...baseFilter,
        [dbKey]: { $exists: true, $ne: "" }
      });

      const options = values
        .map((value) => String(value).trim())
        .filter(isUsableFilterOptionValue)
        .sort();

      if (options.length > 0) {
        results.push({
          type,
          label: FALLBACK_FILTER_LABELS[type] || type,
          dbKey,
          options,
          values: options
        });
      }
    }

    const tagOptions = (await DrawingModel.distinct("tagNames", {
      ...baseFilter,
      tagNames: { $exists: true, $ne: [] }
    })) as string[];

    const normalizedTagOptions = tagOptions
      .map((value) => String(value).trim())
      .filter((value) => isUsableFilterOptionValue(value) && value.includes(":"))
      .sort();
    if (normalizedTagOptions.length > 0) {
      results.push({
        type: "tagNames",
        label: "Tag name",
        dbKey: "tagNames",
        options: normalizedTagOptions,
        values: normalizedTagOptions
      });
    }

    // Return only fields that have actual data
    return sendSuccess(res, results.filter((r) => r !== null && r.options.length > 0));
  })
);

router.get(
  "/:id",
  requireAuth,
  validate(drawingIdSchema),
  asyncHandler(async (req, res) => {
    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing khong ton tai");

    ensureProjectRole(
      await ProjectModel.findById(drawing.projectId),
      req.user!.id,
      "technician",
      "Drawing khong ton tai hoac khong co quyen"
    );

    return sendSuccess(res, drawing);
  })
);

router.get(
  "/:id/versions",
  requireAuth,
  validate(drawingIdSchema),
  asyncHandler(async (req, res) => {
    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing khong ton tai");

    ensureProjectRole(
      await ProjectModel.findById(drawing.projectId),
      req.user!.id,
      "technician",
      "Drawing khong ton tai hoac khong co quyen"
    );

    const versions = await DrawingModel.find({
      projectId: drawing.projectId,
      drawingCode: drawing.drawingCode
    }).sort({ versionIndex: -1, createdAt: -1 });

    return sendSuccess(res, versions);
  })
);

router.get(
  "/:id/file",
  requireAuth,
  validate(drawingIdSchema),
  asyncHandler(async (req, res) => {
    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing khong ton tai");

    ensureProjectRole(
      await ProjectModel.findById(drawing.projectId),
      req.user!.id,
      "technician",
      "Drawing khong ton tai hoac khong co quyen"
    );

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    // Normalize Content-Type: IFC files may have been stored as octet-stream on Windows
    const isIfcFile =
      drawing.fileType === "3d" ||
      (drawing.originalName || "").toLowerCase().endsWith(".ifc") ||
      drawing.mimeType === "application/x-step" ||
      drawing.mimeType === "application/ifc" ||
      drawing.mimeType === "model/ifc" ||
      drawing.mimeType === "text/ifc";
    const contentType = isIfcFile ? "application/ifc" : drawing.mimeType;
    res.setHeader("Content-Type", contentType);

    // Build standardized filename for download
    const safeName = path.basename(drawing.originalName || drawing.storageKey);
    const isDownload = req.query.download === "1" || req.query.download === "true";

    // Use standardized filename with drawing code for better organization
    const downloadFilename = drawing.drawingCode && isDownload
      ? buildStandardizedDrawingFileName(drawing.drawingCode, drawing.mimeType, safeName)
      : safeName;

    res.setHeader("Content-Disposition", `${isDownload ? "attachment" : "inline"}; filename="${downloadFilename}"`);
    res.setHeader("Content-Length", String(drawing.size));

    if (config.storageType === "s3") {
      const stream = await getDrawingS3StreamWithFallback(drawing.storageKey);
      stream.pipe(res);
    } else {
      const filePath = getLocalDrawingPath(drawing.storageKey);
      if (!fs.existsSync(filePath)) throw errors.notFound("File khong ton tai");

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  })
);

router.get(
  "/:id/zones",
  requireAuth,
  validate(drawingIdSchema),
  asyncHandler(async (req, res) => {
    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing khong ton tai");

    ensureProjectRole(
      await ProjectModel.findById(drawing.projectId),
      req.user!.id,
      "technician",
      "Drawing khong ton tai hoac khong co quyen"
    );

    const zones = await ZoneModel.find({ drawingId: req.params.id }).sort({ createdAt: -1 });
    return sendSuccess(res, zones);
  })
);

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) throw errors.validation("Ten khong duoc de trong");

    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing khong ton tai");

    ensureProjectRole(
      await ProjectModel.findById(drawing.projectId),
      req.user!.id,
      "technician",
      "Drawing khong ton tai hoac khong co quyen"
    );

    const safeName = sanitizeText(name);
    await DrawingModel.updateMany(
      {
        projectId: drawing.projectId,
        drawingCode: drawing.drawingCode
      },
      { $set: { name: safeName } }
    );
    const updated = await DrawingModel.findById(req.params.id);

    return sendSuccess(res, updated);
  })
);

router.delete(
  "/:id",
  requireAuth,
  validate(drawingIdSchema),
  asyncHandler(async (req, res) => {
    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) throw errors.notFound("Drawing khong ton tai");

    // Check delete permission: chỉ admin hoặc người tạo mới được xóa
    const project = await ProjectModel.findById(drawing.projectId);
    canDeleteResource(project, req.user!.id, drawing.createdBy, "Drawing khong ton tai hoac khong co quyen");

    const storageRefCount = await DrawingModel.countDocuments({
      storageKey: drawing.storageKey,
      _id: { $ne: drawing._id }
    });

    if (storageRefCount === 0) {
      if (config.storageType === "s3") {
        try {
          await deleteFromS3(drawing.storageKey);
        } catch (err) {
          console.error("Failed to delete file from S3:", err);
        }
      } else {
        const filePath = getLocalDrawingPath(drawing.storageKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await DrawingModel.deleteOne({ _id: req.params.id });

    if (drawing.isLatestVersion !== false) {
      const newLatest = await DrawingModel.findOne({
        projectId: drawing.projectId,
        drawingCode: drawing.drawingCode
      }).sort({ versionIndex: -1, createdAt: -1 });

      if (newLatest && !newLatest.isLatestVersion) {
        newLatest.isLatestVersion = true;
        await newLatest.save();
      }
    }

    return sendSuccess(res, { ok: true });
  })
);

/**
 * POST /drawings/ifc
 * Upload IFC 3D file
 */
router.post(
  "/ifc",
  requireAuth,
  uploadLimiter,
  uploadIfc.single("file"),
  validate(createDrawingSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw errors.validation("Yeu cau file IFC upload");
    }

    const {
      projectId,
      buildingId,
      floorId,
      disciplineId,
      drawingCode: drawingCodeInput,
      name,
      tagNames,
      linkedDrawingId
    } = req.body as {
      projectId: string;
      buildingId?: string;
      floorId?: string;
      disciplineId?: string;
      drawingCode?: string;
      name?: string;
      tagNames?: string[];
      linkedDrawingId?: string;
    };

    const project = await ProjectModel.findById(projectId);
    ensureProjectRole(project, req.user!.id, "technician", "Project khong ton tai hoac khong co quyen");

    // Validate IFC file — buffer available for S3/memory storage, path for local/disk storage
    const validationResult = req.file.buffer
      ? await validateIfcFile(req.file.buffer, true)
      : await validateIfcFilePath(req.file.path);
    if (!validationResult.valid) {
      throw errors.validation(
        `File IFC khong hop le: ${validationResult.errors?.join(", ") || "Unknown error"}`
      );
    }

    // Check if linked drawing exists and belongs to same project
    if (linkedDrawingId) {
      const linkedDrawing = await DrawingModel.findById(linkedDrawingId);
      if (!linkedDrawing) {
        throw errors.validation("Linked drawing khong ton tai");
      }
      if (linkedDrawing.projectId.toString() !== projectId) {
        throw errors.validation("Linked drawing phai cung project");
      }
      if (linkedDrawing.fileType !== "2d") {
        throw errors.validation("Linked drawing phai la file 2D (PDF)");
      }
    }

    // Upload file
    const storageKey = await handleFileUpload(req.file, "drawings");

    // Build drawing code similar to PDF upload
    let finalDrawingCode: string;
    if (drawingCodeInput) {
      finalDrawingCode = normalizeDrawingCode(drawingCodeInput);
    } else {
      // Auto-generate code
      const codeSegments: string[] = [];
      if (buildingId) {
        const building = await BuildingModel.findById(buildingId);
        if (building) codeSegments.push(building.code);
      }
      if (floorId) {
        const floor = await FloorModel.findById(floorId);
        if (floor) codeSegments.push(floor.code);
      }
      if (disciplineId) {
        const discipline = await DisciplineModel.findById(disciplineId);
        if (discipline) codeSegments.push(discipline.code);
      }
      const codeBase = codeSegments.length > 0 ? codeSegments.join("-") : "IFC";

      // Use simplified auto-code generation for IFC
      const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const codePattern = new RegExp(`^${escapeRegex(codeBase)}-(\\d{3})$`);
      const existingCodes = await DrawingModel.find({
        projectId,
        drawingCode: { $regex: `^${escapeRegex(codeBase)}-\\d{3}$` }
      })
        .select("drawingCode")
        .lean();

      let maxSequence = 0;
      existingCodes.forEach((item) => {
        const match = String(item.drawingCode || "").toUpperCase().match(codePattern);
        if (!match) return;
        const value = Number(match[1]);
        if (Number.isFinite(value) && value > maxSequence) {
          maxSequence = value;
        }
      });

      finalDrawingCode = `${codeBase}-${String(maxSequence + 1).padStart(3, "0")}`;
    }

    // Get version info
    const existingVersions = await DrawingModel.find({
      projectId,
      drawingCode: finalDrawingCode
    })
      .sort({ versionIndex: -1 })
      .limit(1)
      .select("versionIndex");

    const versionIndex = existingVersions.length > 0 ? existingVersions[0].versionIndex + 1 : 1;

    // Mark old versions as not latest
    if (versionIndex > 1) {
      await DrawingModel.updateMany(
        { projectId, drawingCode: finalDrawingCode },
        { isLatestVersion: false }
      );
    }

    const sortIndex = await getNextSortIndex(DrawingModel, {
      projectId,
      ...(disciplineId ? { disciplineId } : {}),
      ...(floorId ? { floorId } : {}),
      ...(buildingId ? { buildingId } : {})
    });

    // Merge tags
    const autoTags: string[] = [];
    if (buildingId) {
      const building = await BuildingModel.findById(buildingId);
      if (building) autoTags.push(`building:${building.code.toLowerCase()}`);
    }
    if (floorId) {
      const floor = await FloorModel.findById(floorId);
      if (floor) autoTags.push(`floor:${floor.code.toLowerCase()}`);
    }
    if (disciplineId) {
      const discipline = await DisciplineModel.findById(disciplineId);
      if (discipline) autoTags.push(`discipline:${discipline.code.toLowerCase()}`);
    }
    autoTags.push("3d", "ifc");

    const finalTagNames = mergeTagNames(autoTags, tagNames);

    // Create drawing document
    const drawing = await DrawingModel.create({
      projectId,
      buildingId: buildingId || undefined,
      floorId: floorId || undefined,
      disciplineId: disciplineId || undefined,
      name: name || finalDrawingCode,
      drawingCode: finalDrawingCode,
      versionIndex,
      isLatestVersion: true,
      tagNames: finalTagNames,
      sortIndex,
      originalName: req.file.originalname,
      storageKey,
      mimeType: req.file.mimetype,
      size: req.file.size,
      fileType: linkedDrawingId ? "hybrid" : "3d",
      linkedDrawingId: linkedDrawingId || undefined,
      ifcMetadata: {
        ifcSchema: validationResult.schema,
        containsBuildingElements: validationResult.containsBuildingElements,
        elementCount: validationResult.elementCount,
        validated: true,
        validatedAt: new Date()
      },
      createdBy: req.user!.id
    });

    // If linked, update the linked drawing
    if (linkedDrawingId) {
      await DrawingModel.findByIdAndUpdate(linkedDrawingId, {
        linkedDrawingId: drawing._id,
        fileType: "hybrid"
      });
    }

    return sendSuccess(res, {
      ...drawing.toObject(),
      validation: {
        valid: validationResult.valid,
        warnings: validationResult.warnings
      }
    });
  })
);

/**
 * POST /drawings/link
 * Link 2D PDF and 3D IFC files
 */
router.post(
  "/link",
  requireAuth,
  validate(linkDrawingsSchema),
  asyncHandler(async (req, res) => {
    const { drawing2dId, drawing3dId } = req.body as {
      drawing2dId: string;
      drawing3dId: string;
    };

    const drawing2d = await DrawingModel.findById(drawing2dId);
    const drawing3d = await DrawingModel.findById(drawing3dId);

    if (!drawing2d || !drawing3d) {
      throw errors.notFound("Drawing khong ton tai");
    }

    // Verify project access
    const project = await ProjectModel.findById(drawing2d.projectId);
    ensureProjectRole(project, req.user!.id, "admin", "Khong co quyen");

    // Validate same project
    if (drawing2d.projectId.toString() !== drawing3d.projectId.toString()) {
      throw errors.validation("Hai drawing phai cung project");
    }

    // Validate file types
    if (drawing2d.mimeType !== "application/pdf") {
      throw errors.validation("drawing2d phai la file PDF");
    }

    const is3dFile =
      drawing3d.mimeType === "application/x-step" ||
      drawing3d.mimeType === "application/ifc" ||
      drawing3d.mimeType === "model/ifc" ||
      drawing3d.mimeType === "text/ifc" ||
      (drawing3d.mimeType === "text/plain" && drawing3d.originalName.toLowerCase().endsWith(".ifc"));

    if (!is3dFile) {
      throw errors.validation("drawing3d phai la file IFC");
    }

    // Check if already linked
    if (drawing2d.linkedDrawingId || drawing3d.linkedDrawingId) {
      throw errors.validation("Mot trong hai drawing da duoc link voi file khac");
    }

    // Link drawings
    drawing2d.linkedDrawingId = drawing3d._id;
    drawing2d.fileType = "hybrid";
    await drawing2d.save();

    drawing3d.linkedDrawingId = drawing2d._id;
    drawing3d.fileType = "hybrid";
    await drawing3d.save();

    return sendSuccess(res, {
      drawing2d: drawing2d.toObject(),
      drawing3d: drawing3d.toObject()
    });
  })
);

/**
 * DELETE /drawings/:id/unlink
 * Unlink a drawing from its paired file
 */
router.delete(
  "/:id/unlink",
  requireAuth,
  validate(unlinkDrawingSchema),
  asyncHandler(async (req, res) => {
    const drawing = await DrawingModel.findById(req.params.id);
    if (!drawing) {
      throw errors.notFound("Drawing khong ton tai");
    }

    const project = await ProjectModel.findById(drawing.projectId);
    ensureProjectRole(project, req.user!.id, "admin", "Khong co quyen");

    if (!drawing.linkedDrawingId) {
      throw errors.validation("Drawing khong co link");
    }

    const linkedDrawing = await DrawingModel.findById(drawing.linkedDrawingId);

    // Unlink both drawings
    drawing.linkedDrawingId = undefined;
    drawing.fileType = drawing.mimeType === "application/pdf" ? "2d" : "3d";
    await drawing.save();

    if (linkedDrawing) {
      linkedDrawing.linkedDrawingId = undefined;
      linkedDrawing.fileType = linkedDrawing.mimeType === "application/pdf" ? "2d" : "3d";
      await linkedDrawing.save();
    }

    return sendSuccess(res, {
      drawing: drawing.toObject(),
      linkedDrawing: linkedDrawing?.toObject()
    });
  })
);

export default router;
