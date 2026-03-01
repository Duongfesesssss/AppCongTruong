type ParsedDrawingToken = {
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

export type DrawingAutoScanResult = {
  matched: boolean;
  source: "filename" | "ocr" | "none";
  parsed?: ParsedDrawingToken;
  tagNames: string[];
  ocrText?: string;
  error?: string;
};

type OcrRegionPreset = {
  key: "bottom-right" | "right-margin" | "bottom-band" | "full-page";
  x: number;
  y: number;
  width: number;
  height: number;
};

type OcrImageVariant = {
  variant: "enhanced" | "raw";
  imageDataUrl: string;
};

const drawingCodePattern =
  /([A-Z0-9.]+)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)(?:-([A-Z0-9]+))?/;

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
const SIMPLE_LEVEL_PATTERN = /^\d{1,2}$/;

const stripFileExtension = (value: string) => value.replace(/\.[A-Z0-9]{1,5}$/i, "");
const splitCodeSegments = (input: string) => {
  return stripFileExtension(input.toUpperCase())
    .replace(/[_\s]+/g, "-")
    .split(/[^A-Z0-9.]+/)
    .flatMap((part) => part.split("-"))
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const OCR_REGION_PRESETS: OcrRegionPreset[] = [
  { key: "bottom-right", x: 0.56, y: 0.6, width: 0.44, height: 0.4 },
  { key: "right-margin", x: 0.7, y: 0.12, width: 0.3, height: 0.88 },
  { key: "bottom-band", x: 0.2, y: 0.72, width: 0.8, height: 0.28 },
  { key: "full-page", x: 0, y: 0, width: 1, height: 1 }
];

const toTagName = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const buildTagNames = (parsed: Omit<ParsedDrawingToken, "tagNames">) => {
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

const normalizeCodeSegment = (value: string, allowDot = false) => {
  const pattern = allowDot ? /[^A-Z0-9.]/g : /[^A-Z0-9]/g;
  return value.toUpperCase().replace(pattern, "");
};

const hasLetter = (value: string) => /[A-Z]/.test(value);
const hasDigit = (value: string) => /[0-9]/.test(value);
const hasAlphaNumeric = (value: string) => /[A-Z0-9]/.test(value);

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
    const token = normalizeCodeSegment(values[index], false);
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

const buildParsedDrawingToken = (core: {
  projectCode: string;
  unitCode: string;
  disciplineCode: string;
  buildingCode: string;
  buildingPartCode: string;
  floorCode: string;
  fileTypeCode?: string;
}): ParsedDrawingToken => {
  const drawingCode = `${core.projectCode}-${core.unitCode}-${core.disciplineCode}-${core.buildingCode}-${core.buildingPartCode}-${core.floorCode}`;
  const parsedWithoutTags: Omit<ParsedDrawingToken, "tagNames"> = {
    ...core,
    drawingCode,
    suggestedName: core.fileTypeCode ? `${drawingCode}-${core.fileTypeCode}` : drawingCode
  };

  return {
    ...parsedWithoutTags,
    tagNames: buildTagNames(parsedWithoutTags)
  };
};

const parseDrawingTokenLoose = (input: string): ParsedDrawingToken | null => {
  const segments = splitCodeSegments(input);

  if (segments.length < 6) return null;

  let bestCandidate: { score: number; parsed: ParsedDrawingToken } | null = null;
  for (let startIndex = 0; startIndex <= segments.length - 6; startIndex += 1) {
    for (let unitIndex = startIndex + 1; unitIndex <= segments.length - 5; unitIndex += 1) {
      const projectSegments = segments
        .slice(startIndex, unitIndex)
        .map((part) => normalizeCodeSegment(part, true))
        .filter(Boolean);
      if (projectSegments.length === 0) continue;
      const projectCode = projectSegments.join("-");
      if (!isLikelyProjectCode(projectCode)) continue;

      const unitCode = normalizeCodeSegment(segments[unitIndex], false);
      const disciplineCode = normalizeCodeSegment(segments[unitIndex + 1], false);
      const buildingCode = normalizeCodeSegment(segments[unitIndex + 2], false);
      const buildingPartCode = normalizeCodeSegment(segments[unitIndex + 3], false);
      const floorCode = normalizeCodeSegment(segments[unitIndex + 4], false);
      const coreFields = [unitCode, disciplineCode, buildingCode, buildingPartCode];

      if (coreFields.some((field) => !field || !isLikelyCoreCode(field))) continue;
      if (!isLikelyFloorCodeStrict(floorCode)) continue;
      if ([...coreFields, floorCode].filter(hasLetter).length < 2) continue;

      const score = scoreLooseCandidate([projectCode, unitCode, disciplineCode, buildingCode, buildingPartCode, floorCode]);
      if (score < 11) continue;

      const fileTypeCode = pickLooseFileTypeCode(segments.slice(unitIndex + 5));
      const parsed = buildParsedDrawingToken({
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

const scoreParsedTokenCandidate = (candidate: ParsedDrawingToken) => {
  let score = scoreLooseCandidate([
    candidate.projectCode,
    candidate.unitCode,
    candidate.disciplineCode,
    candidate.buildingCode,
    candidate.buildingPartCode,
    candidate.floorCode
  ]);

  if (candidate.fileTypeCode) {
    score += isKnownFileType(candidate.fileTypeCode) ? 3 : 1;
  }
  if (isKnownLevel(candidate.floorCode)) score += 3;
  if (SIMPLE_LEVEL_PATTERN.test(candidate.floorCode)) score += 2;
  if (isKnownVolume(candidate.floorCode)) score -= 5;
  if (isKnownVolume(candidate.buildingPartCode)) score += 2;
  return score;
};

const parseDrawingTokenHeuristic = (input: string): ParsedDrawingToken | null => {
  const segments = splitCodeSegments(input);
  if (segments.length < 6) return null;

  const normalized = segments.map((segment) => normalizeCodeSegment(segment, false));
  const disciplineIndex = normalized.findIndex((segment) => isKnownDiscipline(segment));
  if (disciplineIndex < 1) return null;

  const unitCode = normalizeCodeSegment(segments[disciplineIndex - 1], false);
  if (!unitCode || !isLikelyCodeToken(unitCode)) return null;

  const projectSegments = segments
    .slice(0, disciplineIndex - 1)
    .map((segment) => normalizeCodeSegment(segment, true))
    .filter(Boolean);
  if (projectSegments.length === 0) return null;

  const projectCode = projectSegments.join("-");
  if (!isLikelyProjectCode(projectCode)) return null;

  const disciplineCode = normalizeCodeSegment(segments[disciplineIndex], false);
  const tail = segments
    .slice(disciplineIndex + 1)
    .map((segment) => normalizeCodeSegment(segment, false))
    .filter(Boolean);
  if (tail.length === 0) return null;

  let buildingCode =
    tail.find(
      (token) =>
        /^[A-Z]{1,4}$/.test(token) &&
        !isKnownVolume(token) &&
        !isKnownDiscipline(token) &&
        !isKnownFileType(token) &&
        !isKnownLevel(token)
    ) || tail[0];
  if (!buildingCode) buildingCode = "NA";

  let buildingPartCode =
    tail.find((token) => isKnownVolume(token)) ||
    tail.find((token) => /^[A-Z]{1,4}$/.test(token) && token !== buildingCode) ||
    "NA";

  const levelCandidates = tail.filter(
    (token) => isKnownLevel(token) || SIMPLE_LEVEL_PATTERN.test(token) || /^L\d{1,2}$/.test(token)
  );
  let floorCode = levelCandidates.length > 0 ? levelCandidates[levelCandidates.length - 1] : "";
  if (!floorCode) {
    floorCode = tail.find((token) => isLikelyLevelCode(token) && !isKnownVolume(token)) || "";
  }
  if (SIMPLE_LEVEL_PATTERN.test(floorCode)) {
    floorCode = floorCode.padStart(2, "0");
  }
  if (!floorCode) return null;

  if (buildingPartCode === floorCode) {
    buildingPartCode = "NA";
  }

  const fileTypeCode = pickLooseFileTypeCode(tail);
  return buildParsedDrawingToken({
    projectCode,
    unitCode,
    disciplineCode,
    buildingCode,
    buildingPartCode,
    floorCode,
    fileTypeCode
  });
};

const isReliableParsedToken = (candidate: ParsedDrawingToken) => {
  if (!isLikelyProjectCode(candidate.projectCode)) return false;
  if (![candidate.unitCode, candidate.disciplineCode, candidate.buildingCode, candidate.buildingPartCode].every(isLikelyCoreCode)) {
    return false;
  }
  if (!isLikelyFloorCodeStrict(candidate.floorCode)) return false;
  if (![candidate.unitCode, candidate.disciplineCode, candidate.buildingCode, candidate.buildingPartCode, candidate.floorCode].some(hasLetter)) {
    return false;
  }
  return true;
};

const parseDrawingToken = (input: string): ParsedDrawingToken | null => {
  const sanitizedInput = stripFileExtension(input);
  const normalized = sanitizedInput.toUpperCase().replace(/\s+/g, "").replace(/_/g, "-");
  const matched = normalized.match(drawingCodePattern);

  const candidates: ParsedDrawingToken[] = [];
  if (matched) {
    const [
      ,
      projectCode,
      unitCode,
      disciplineCode,
      buildingCode,
      buildingPartCode,
      floorCode,
      fileTypeCodeRaw
    ] = matched;
    const coreFields = [unitCode, disciplineCode, buildingCode, buildingPartCode, floorCode];
    const isValidMatchedToken =
      isLikelyProjectCode(projectCode) &&
      [unitCode, disciplineCode, buildingCode, buildingPartCode].every((field) => isLikelyCoreCode(field)) &&
      isLikelyFloorCodeStrict(floorCode) &&
      coreFields.filter(hasLetter).length >= 2 &&
      (!fileTypeCodeRaw || /^[A-Z][A-Z0-9]*$/.test(fileTypeCodeRaw));

    if (isValidMatchedToken) {
      candidates.push(
        buildParsedDrawingToken({
          projectCode,
          unitCode,
          disciplineCode,
          buildingCode,
          buildingPartCode,
          floorCode,
          fileTypeCode: fileTypeCodeRaw || undefined
        })
      );
    }
  }

  const looseCandidate = parseDrawingTokenLoose(sanitizedInput);
  if (looseCandidate) {
    candidates.push(looseCandidate);
  }

  const heuristicCandidate = parseDrawingTokenHeuristic(sanitizedInput);
  if (heuristicCandidate) {
    candidates.push(heuristicCandidate);
  }

  const reliableCandidates = candidates.filter(isReliableParsedToken);
  if (reliableCandidates.length === 0) return null;
  return reliableCandidates.sort((a, b) => scoreParsedTokenCandidate(b) - scoreParsedTokenCandidate(a))[0];
};

let pdfjsLibPromise: Promise<any> | null = null;
const getPdfJsLib = async () => {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist").then((lib) => {
      if (typeof window !== "undefined" && lib?.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
        lib.GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`;
      }
      return lib;
    });
  }
  return pdfjsLibPromise;
};

const clamp01 = (value: number) => {
  return Math.min(1, Math.max(0, value));
};

const normalizeRegionPreset = (region: OcrRegionPreset): OcrRegionPreset => {
  const x = clamp01(region.x);
  const y = clamp01(region.y);
  const maxWidth = Math.max(0.05, 1 - x);
  const maxHeight = Math.max(0.05, 1 - y);
  const width = clamp01(Math.max(0.05, Math.min(region.width, maxWidth)));
  const height = clamp01(Math.max(0.05, Math.min(region.height, maxHeight)));
  return {
    ...region,
    x,
    y,
    width,
    height
  };
};

const extractPdfPageCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const pdfjsLib = await getPdfJsLib();
  const buffer = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: buffer });
  const pdf = await task.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Khong tao duoc canvas de OCR");
  }

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
};

const extractRegionCanvas = (sourceCanvas: HTMLCanvasElement, region: OcrRegionPreset): HTMLCanvasElement => {
  const normalizedRegion = normalizeRegionPreset(region);
  const srcX = Math.max(0, Math.floor(sourceCanvas.width * normalizedRegion.x));
  const srcY = Math.max(0, Math.floor(sourceCanvas.height * normalizedRegion.y));
  const srcWidth = Math.max(8, Math.floor(sourceCanvas.width * normalizedRegion.width));
  const srcHeight = Math.max(8, Math.floor(sourceCanvas.height * normalizedRegion.height));

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = srcWidth;
  targetCanvas.height = srcHeight;
  const targetContext = targetCanvas.getContext("2d");
  if (!targetContext) {
    throw new Error("Khong tao duoc canvas vung OCR");
  }

  targetContext.drawImage(sourceCanvas, srcX, srcY, srcWidth, srcHeight, 0, 0, srcWidth, srcHeight);
  return targetCanvas;
};

const getGrayscale = (r: number, g: number, b: number) => {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
};

const computeOtsuThreshold = (histogram: number[], total: number) => {
  let sumAll = 0;
  for (let i = 0; i < 256; i += 1) {
    sumAll += i * histogram[i];
  }

  let sumBackground = 0;
  let weightBackground = 0;
  let maxBetweenClassVariance = 0;
  let threshold = 127;

  for (let i = 0; i < 256; i += 1) {
    weightBackground += histogram[i];
    if (weightBackground === 0) continue;

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += i * histogram[i];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sumAll - sumBackground) / weightForeground;
    const betweenClassVariance =
      weightBackground * weightForeground * (meanBackground - meanForeground) * (meanBackground - meanForeground);

    if (betweenClassVariance > maxBetweenClassVariance) {
      maxBetweenClassVariance = betweenClassVariance;
      threshold = i;
    }
  }

  return threshold;
};

const buildEnhancedImageDataUrl = (regionCanvas: HTMLCanvasElement) => {
  const scale = 2;
  const enhancedCanvas = document.createElement("canvas");
  enhancedCanvas.width = Math.max(8, Math.floor(regionCanvas.width * scale));
  enhancedCanvas.height = Math.max(8, Math.floor(regionCanvas.height * scale));

  const enhancedContext = enhancedCanvas.getContext("2d");
  if (!enhancedContext) {
    throw new Error("Khong tao duoc canvas enhanced OCR");
  }

  enhancedContext.imageSmoothingEnabled = true;
  enhancedContext.drawImage(regionCanvas, 0, 0, enhancedCanvas.width, enhancedCanvas.height);

  const imageData = enhancedContext.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
  const pixels = imageData.data;
  const histogram = new Array<number>(256).fill(0);
  const luminance = new Uint8Array(enhancedCanvas.width * enhancedCanvas.height);

  for (let i = 0, index = 0; i < pixels.length; i += 4, index += 1) {
    const gray = getGrayscale(pixels[i], pixels[i + 1], pixels[i + 2]);
    luminance[index] = gray;
    histogram[gray] += 1;
  }

  const threshold = computeOtsuThreshold(histogram, luminance.length);
  for (let i = 0, index = 0; i < pixels.length; i += 4, index += 1) {
    const value = luminance[index] > threshold ? 255 : 0;
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
    pixels[i + 3] = 255;
  }

  enhancedContext.putImageData(imageData, 0, 0);
  return enhancedCanvas.toDataURL("image/png");
};

const buildOcrImageVariants = (regionCanvas: HTMLCanvasElement, regionKey: OcrRegionPreset["key"]): OcrImageVariant[] => {
  const rawImage = regionCanvas.toDataURL("image/png");
  const enhancedImage = buildEnhancedImageDataUrl(regionCanvas);

  if (regionKey === "full-page") {
    return [{ variant: "enhanced", imageDataUrl: enhancedImage }];
  }

  return [
    { variant: "enhanced", imageDataUrl: enhancedImage },
    { variant: "raw", imageDataUrl: rawImage }
  ];
};

const extractTextByTesseract = async (imageDataUrl: string): Promise<string> => {
  const tesseract = (await import("tesseract.js")) as any;
  const result = await tesseract.recognize(imageDataUrl, "eng", {
    logger: () => {
      // no-op
    }
  });
  return String(result?.data?.text || "");
};

export const autoScanDrawingFile = async (file: File): Promise<DrawingAutoScanResult> => {
  const parsedFromFilename = parseDrawingToken(file.name);
  if (parsedFromFilename) {
    return {
      matched: true,
      source: "filename",
      parsed: parsedFromFilename,
      tagNames: parsedFromFilename.tagNames
    };
  }

  if (!process.client) {
    return { matched: false, source: "none", tagNames: [] };
  }

  try {
    const sourceCanvas = await extractPdfPageCanvas(file);
    let fallbackOcrText = "";
    const collectedTexts: string[] = [];

    for (const region of OCR_REGION_PRESETS) {
      const regionCanvas = extractRegionCanvas(sourceCanvas, region);
      const imageVariants = buildOcrImageVariants(regionCanvas, region.key);

      for (const imageVariant of imageVariants) {
        const regionText = await extractTextByTesseract(imageVariant.imageDataUrl);
        const trimmedText = regionText.trim();
        if (trimmedText) {
          collectedTexts.push(trimmedText);
          if (trimmedText.length > fallbackOcrText.length) {
            fallbackOcrText = trimmedText;
          }
        }

        const parsedFromOcr = parseDrawingToken(regionText);
        if (parsedFromOcr) {
          return {
            matched: true,
            source: "ocr",
            parsed: parsedFromOcr,
            tagNames: parsedFromOcr.tagNames,
            ocrText: regionText
          };
        }
      }
    }

    const mergedText = collectedTexts.join("\n");
    if (mergedText) {
      const parsedFromMergedText = parseDrawingToken(mergedText);
      if (parsedFromMergedText) {
        return {
          matched: true,
          source: "ocr",
          parsed: parsedFromMergedText,
          tagNames: parsedFromMergedText.tagNames,
          ocrText: mergedText
        };
      }
    }

    return {
      matched: false,
      source: "none",
      tagNames: [],
      ocrText: fallbackOcrText
    };
  } catch (error) {
    return {
      matched: false,
      source: "none",
      tagNames: [],
      error: (error as Error)?.message || "Auto-scan that bai"
    };
  }
};
