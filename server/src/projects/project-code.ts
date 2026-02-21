import { toCode } from "../lib/utils";

const PROJECT_CODE_MAX_LENGTH = 10;
const PROJECT_CODE_DEFAULT_LENGTH = 3;
const MAX_PROJECT_CODE_ATTEMPTS = 9999;

const normalizeCode = (value: string) => value.trim().toUpperCase();

const buildCodeCandidate = (base: string, suffix: number) => {
  if (suffix === 0) return base;

  const suffixText = String(suffix);
  const prefixLength = Math.max(1, PROJECT_CODE_MAX_LENGTH - suffixText.length);
  return `${base.slice(0, prefixLength)}${suffixText}`;
};

export const getProjectCodeBase = (params: { name: string; code?: string }) => {
  const rawCode = params.code?.trim();
  const rawValue = rawCode || params.name;
  const preferredLength = rawCode ? PROJECT_CODE_MAX_LENGTH : PROJECT_CODE_DEFAULT_LENGTH;
  return toCode(rawValue, preferredLength).slice(0, PROJECT_CODE_MAX_LENGTH);
};

export const buildUniqueProjectCode = (
  params: { name: string; code?: string },
  existingCodes: Iterable<string>
) => {
  const usedCodes = new Set<string>();
  for (const code of existingCodes) {
    if (!code) continue;
    usedCodes.add(normalizeCode(code));
  }

  const base = getProjectCodeBase(params);
  if (!usedCodes.has(base)) {
    return base;
  }

  for (let suffix = 1; suffix <= MAX_PROJECT_CODE_ATTEMPTS; suffix += 1) {
    const candidate = buildCodeCandidate(base, suffix);
    if (!usedCodes.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("Không thể tạo mã project duy nhất");
};
