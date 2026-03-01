import path from "node:path";

import { sanitizeText } from "../lib/utils";

const KNOWN_ORIGINATOR_CODES = new Set(["A79", "SDE", "CON", "EDE", "BRL"]);
const KNOWN_DISCIPLINE_CODES = new Set([
  "AA",
  "AR",
  "ES",
  "ST",
  "EM",
  "ME",
  "EP",
  "PL",
  "EF",
  "FP",
  "EL",
  "ELT",
  "HV",
  "LUF",
  "IN",
  "LA"
]);
const KNOWN_BUILDING_CODES = new Set(["KS", "TM", "VP", "NT", "SH"]);
const KNOWN_VOLUME_CODES = new Set(["BS", "PO", "TY", "XO", "GR", "GRU", "SE", "AN", "AS", "SH"]);
const KNOWN_FILE_TYPE_CODES = new Set(["M2", "M3", "DR", "SH", "SM", "SC", "SCH", "DT", "DET", "IS", "ISO", "KP"]);
const LEVEL_PATTERN = /^(B\d+|L\d+|RF|DG|DA|UG\d*|EG|GF|OG\d+|MZ|MEZ|ZZ)$/;

const normalizeSegment = (value: string) => value.trim().toUpperCase();
const stripUnsafe = (value: string, allowDot = false) => {
  const pattern = allowDot ? /[^A-Z0-9.]/g : /[^A-Z0-9]/g;
  return normalizeSegment(value).replace(pattern, "");
};

const toCodeLabel = (value: string) => {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const toTagName = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const hasLetter = (value: string) => /[A-Z]/.test(value);
const hasDigit = (value: string) => /[0-9]/.test(value);
const hasAlphaNumeric = (value: string) => /[A-Z0-9]/.test(value);

const normalizeLooseSegments = (value: string) => {
  return value
    .toUpperCase()
    .replace(/[_\s]+/g, "-")
    .split(/[^A-Z0-9.]+/)
    .map(normalizeSegment)
    .filter(Boolean);
};

const isLikelyProjectCode = (value: string) => {
  if (!value) return false;
  const segments = value.split("-").filter(Boolean);
  if (segments.length === 0) return false;
  const firstSegment = segments[0];
  if (!hasDigit(firstSegment) || firstSegment.length < 4) return false;
  return segments.every((segment) => /^[A-Z0-9.]+$/.test(segment) && hasAlphaNumeric(segment));
};

const isLikelyCodeToken = (value: string) => /^[A-Z0-9.]+$/.test(value);
const hasLikelyCoreLength = (value: string, min = 2, max = 12) => value.length >= min && value.length <= max;
const isLikelyCoreCode = (value: string) => isLikelyCodeToken(value) && hasLikelyCoreLength(value, 2, 12);
const isLikelyFloorCodeStrict = (value: string) => {
  if (!value || !isLikelyCodeToken(value)) return false;
  if (isKnownLevel(value)) return true;
  if (/^\d+$/.test(value)) return false;
  return hasLikelyCoreLength(value, 2, 12);
};
const isKnownOriginator = (value: string) => KNOWN_ORIGINATOR_CODES.has(value);
const isKnownDiscipline = (value: string) => KNOWN_DISCIPLINE_CODES.has(value);
const isKnownBuilding = (value: string) => KNOWN_BUILDING_CODES.has(value);
const isKnownVolume = (value: string) => KNOWN_VOLUME_CODES.has(value);
const isKnownFileType = (value: string) => KNOWN_FILE_TYPE_CODES.has(value);
const isKnownLevel = (value: string) => LEVEL_PATTERN.test(value);

const isLikelyLevelCode = (value: string) => {
  if (!value || !isLikelyCodeToken(value)) return false;
  if (isKnownLevel(value)) return true;
  return hasLetter(value) || hasDigit(value);
};

const scoreLooseCandidate = (core: string[]) => {
  const [projectCode, unitCode, disciplineCode, buildingCode, buildingPartCode, floorCode] = core;
  let score = 0;

  if (projectCode.includes(".")) score += 3;
  if (projectCode.includes("-")) score += 1;

  if (isKnownOriginator(unitCode)) score += 6;
  else if (hasLetter(unitCode)) score += 2;

  if (isKnownDiscipline(disciplineCode)) score += 6;
  else if (hasLetter(disciplineCode)) score += 2;

  if (isKnownBuilding(buildingCode)) score += 4;
  else if (hasLetter(buildingCode)) score += 1;

  if (isKnownVolume(buildingPartCode)) score += 4;
  else if (hasLetter(buildingPartCode)) score += 1;

  if (isKnownLevel(floorCode)) score += 5;
  else if (isLikelyLevelCode(floorCode)) score += 1;

  return score;
};

const pickLooseFileTypeCode = (values: string[]) => {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const token = stripUnsafe(values[index]);
    if (!token) continue;
    if (isKnownFileType(token)) {
      return token;
    }
    if (/^[A-Z][A-Z0-9]*$/.test(token)) {
      return token;
    }
  }
  return undefined;
};

export type ParsedDrawingFilename = {
  rawName: string;
  fileBaseName: string;
  projectCode: string;
  unitCode: string;
  disciplineCode: string;
  buildingCode: string;
  buildingPartCode: string;
  floorCode: string;
  fileTypeCode?: string;
  drawingCode: string;
  suggestedName: string;
  tagNames: string[];
};

const buildTagNames = (parsed: Omit<ParsedDrawingFilename, "tagNames">): string[] => {
  const tags = [
    `project:${parsed.projectCode}`,
    `unit:${parsed.unitCode}`,
    `discipline:${parsed.disciplineCode}`,
    `building:${parsed.buildingCode}`,
    `part:${parsed.buildingPartCode}`,
    `floor:${parsed.floorCode}`,
    parsed.fileTypeCode ? `fileType:${parsed.fileTypeCode}` : undefined,
    parsed.projectCode,
    parsed.unitCode,
    parsed.disciplineCode,
    parsed.buildingCode,
    parsed.buildingPartCode,
    parsed.floorCode,
    parsed.fileTypeCode
  ];

  const unique = new Set<string>();
  tags.forEach((tag) => {
    if (!tag) return;
    const normalized = toTagName(tag);
    if (normalized) unique.add(normalized);
  });
  return Array.from(unique);
};

const buildParsedDrawingObject = ({
  rawName,
  fileBaseName,
  projectCode,
  unitCode,
  disciplineCode,
  buildingCode,
  buildingPartCode,
  floorCode,
  fileTypeCode
}: {
  rawName: string;
  fileBaseName: string;
  projectCode: string;
  unitCode: string;
  disciplineCode: string;
  buildingCode: string;
  buildingPartCode: string;
  floorCode: string;
  fileTypeCode?: string;
}): ParsedDrawingFilename => {
  const drawingCode = [projectCode, unitCode, disciplineCode, buildingCode, buildingPartCode, floorCode].join("-");
  const suggestedName = fileTypeCode ? `${drawingCode}-${fileTypeCode}` : drawingCode;

  const parsedWithoutTags: Omit<ParsedDrawingFilename, "tagNames"> = {
    rawName,
    fileBaseName,
    projectCode,
    unitCode,
    disciplineCode,
    buildingCode,
    buildingPartCode,
    floorCode,
    fileTypeCode,
    drawingCode,
    suggestedName
  };

  return {
    ...parsedWithoutTags,
    tagNames: buildTagNames(parsedWithoutTags)
  };
};

const buildStrictParsedDrawing = (
  rawName: string,
  fileBaseName: string,
  parts: string[]
): ParsedDrawingFilename | null => {
  if (parts.length < 6 || parts.length > 7) return null;

  const [projectRaw, unitRaw, disciplineRaw, buildingRaw, partRaw, floorRaw, fileTypeRaw] = parts;
  const projectCode = stripUnsafe(projectRaw, true);
  const unitCode = stripUnsafe(unitRaw);
  const disciplineCode = stripUnsafe(disciplineRaw);
  const buildingCode = stripUnsafe(buildingRaw);
  const buildingPartCode = stripUnsafe(partRaw);
  const floorCode = stripUnsafe(floorRaw);
  const fileTypeCode = fileTypeRaw ? stripUnsafe(fileTypeRaw) : undefined;

  const baseFields = [unitCode, disciplineCode, buildingCode, buildingPartCode];
  if (!isLikelyProjectCode(projectCode)) return null;
  if (baseFields.some((field) => !field || !isLikelyCoreCode(field))) return null;
  if (!isLikelyFloorCodeStrict(floorCode)) return null;
  if (fileTypeCode !== undefined && !/^[A-Z][A-Z0-9]*$/.test(fileTypeCode)) return null;
  if ([...baseFields, floorCode].filter(hasLetter).length < 2) return null;

  return buildParsedDrawingObject({
    rawName,
    fileBaseName,
    projectCode,
    unitCode,
    disciplineCode,
    buildingCode,
    buildingPartCode,
    floorCode,
    fileTypeCode
  });
};

const buildLooseParsedDrawing = (
  rawName: string,
  fileBaseName: string,
  parts: string[]
): ParsedDrawingFilename | null => {
  if (parts.length < 6) return null;

  let bestCandidate: { score: number; parsed: ParsedDrawingFilename } | null = null;
  for (let startIndex = 0; startIndex <= parts.length - 6; startIndex += 1) {
    for (let unitIndex = startIndex + 1; unitIndex <= parts.length - 5; unitIndex += 1) {
      const projectParts = parts.slice(startIndex, unitIndex).map((part) => stripUnsafe(part, true)).filter(Boolean);
      if (projectParts.length === 0) continue;
      const projectCode = projectParts.join("-");
      if (!isLikelyProjectCode(projectCode)) continue;

      const unitCode = stripUnsafe(parts[unitIndex]);
      const disciplineCode = stripUnsafe(parts[unitIndex + 1]);
      const buildingCode = stripUnsafe(parts[unitIndex + 2]);
      const buildingPartCode = stripUnsafe(parts[unitIndex + 3]);
      const floorCode = stripUnsafe(parts[unitIndex + 4]);
      const coreFields = [unitCode, disciplineCode, buildingCode, buildingPartCode];

      if (coreFields.some((field) => !field || !isLikelyCoreCode(field))) continue;
      if (!isLikelyFloorCodeStrict(floorCode)) continue;
      if ([...coreFields, floorCode].filter(hasLetter).length < 2) continue;

      const score = scoreLooseCandidate([projectCode, unitCode, disciplineCode, buildingCode, buildingPartCode, floorCode]);
      if (score < 11) continue;

      const remaining = parts.slice(unitIndex + 5);
      const fileTypeCode = pickLooseFileTypeCode(remaining);
      const parsed = buildParsedDrawingObject({
        rawName,
        fileBaseName,
        projectCode,
        unitCode,
        disciplineCode,
        buildingCode,
        buildingPartCode,
        floorCode,
        fileTypeCode
      });

      let totalScore = score;
      if (fileTypeCode) {
        totalScore += isKnownFileType(fileTypeCode) ? 3 : 1;
      }

      if (!bestCandidate || totalScore > bestCandidate.score) {
        bestCandidate = { score: totalScore, parsed };
      }
    }
  }

  return bestCandidate?.parsed || null;
};

const normalizeCandidate = (value: string) => {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "-")
    .replace(/([A-Z0-9]{4})\.([A-Z0-9]{4,8})/g, "$1.$2");
};

export const parseDrawingFilename = (originalName: string): ParsedDrawingFilename | null => {
  const fileBaseName = path.parse(originalName).name;
  const strictParts = fileBaseName.split("-").map(normalizeSegment).filter(Boolean);
  const strictParsed = buildStrictParsedDrawing(originalName, fileBaseName, strictParts);
  if (strictParsed) return strictParsed;

  const looseParts = normalizeLooseSegments(fileBaseName);
  return buildLooseParsedDrawing(originalName, fileBaseName, looseParts);
};

export const parseDrawingMetadataFromText = (text: string): ParsedDrawingFilename | null => {
  const normalized = normalizeCandidate(text);
  const looseParts = normalizeLooseSegments(normalized);
  return buildLooseParsedDrawing(text, text, looseParts);
};

export const buildFallbackDrawingCode = (name: string, originalName: string) => {
  const fromName = toCodeLabel(sanitizeText(name));
  if (fromName) return fromName;

  const fromFile = toCodeLabel(path.parse(originalName).name);
  if (fromFile) return fromFile;

  return `DRAWING-${Date.now()}`;
};
