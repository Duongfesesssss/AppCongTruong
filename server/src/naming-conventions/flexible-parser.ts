import type { NamingConventionDocument, NamingField, KeywordMapping } from "./naming-convention.model";
import { sanitizeText } from "../lib/utils";

export type ParsedField = {
  type: string;
  value: string;
  matchedKeyword?: KeywordMapping;
};

export type FlexibleParsedFilename = {
  rawName: string;
  fields: ParsedField[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Normalize một segment của filename
 */
const normalizeSegment = (value: string): string => {
  return sanitizeText(value).toUpperCase().trim();
};

/**
 * Kiểm tra xem một value có match với keyword không (bao gồm cả aliases)
 */
const matchKeyword = (value: string, keywords: KeywordMapping[]): KeywordMapping | undefined => {
  const normalized = normalizeSegment(value);
  if (!normalized) return undefined;

  for (const keyword of keywords) {
    // Kiểm tra code chính
    if (normalizeSegment(keyword.code) === normalized) {
      return keyword;
    }

    // Kiểm tra aliases
    if (keyword.aliases && keyword.aliases.length > 0) {
      for (const alias of keyword.aliases) {
        if (normalizeSegment(alias) === normalized) {
          return keyword;
        }
      }
    }
  }

  return undefined;
};

/**
 * Validate running number format (001, 002, 003...)
 */
const isValidRunningNumber = (value: string): boolean => {
  const normalized = value.trim();
  return /^\d{3,}$/.test(normalized);
};

/**
 * Parse filename theo naming convention config
 */
export const parseFilenameWithConvention = (
  filename: string,
  convention: NamingConventionDocument
): FlexibleParsedFilename => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fields: ParsedField[] = [];

  // Loại bỏ extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

  // Split theo separator
  const segments = nameWithoutExt.split(convention.separator).map((s) => s.trim()).filter(Boolean);

  // Lấy danh sách enabled fields và sort theo order
  const enabledFields = convention.fields
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  if (enabledFields.length === 0) {
    errors.push("Naming convention chưa được cấu hình field nào");
    return {
      rawName: filename,
      fields: [],
      isValid: false,
      errors,
      warnings
    };
  }

  // Kiểm tra số lượng segment — báo lỗi nếu không khớp nhưng vẫn parse best-effort
  // (trường description là ngoại lệ: nó gom hết segment còn lại nên không cần đếm thêm)
  const hasDescriptionField = enabledFields.some((f) => f.type === "description");
  const requiredFieldCount = enabledFields.filter((f) => f.required).length;
  if (!hasDescriptionField && segments.length !== enabledFields.length) {
    errors.push(
      `Tên file có ${segments.length} phần nhưng quy tắc định nghĩa ${enabledFields.length} trường.`
    );
    // Không return sớm — tiếp tục parse best-effort để trích xuất metadata có thể có
  }
  if (segments.length < requiredFieldCount) {
    errors.push(
      `File thiếu trường bắt buộc. Cần tối thiểu ${requiredFieldCount} trường, nhưng chỉ có ${segments.length} trường.`
    );
  }

  // Parse từng segment theo thứ tự field
  let segmentIndex = 0;
  for (let fieldIndex = 0; fieldIndex < enabledFields.length; fieldIndex++) {
    const field = enabledFields[fieldIndex];

    // Nếu hết segment
    if (segmentIndex >= segments.length) {
      if (field.required) {
        errors.push(`Thiếu trường bắt buộc: ${field.type} (vị trí ${field.order + 1})`);
      }
      continue;
    }

    const segmentValue = segments[segmentIndex];

    // Parse theo type
    if (field.type === "project") {
      // Project code: accept bất kỳ giá trị nào
      fields.push({
        type: field.type,
        value: segmentValue
      });
      segmentIndex++;
    } else if (field.type === "runningNumber") {
      // Running number: luôn consume segment, chỉ warning nếu format không đúng
      fields.push({ type: field.type, value: segmentValue });
      if (!isValidRunningNumber(segmentValue) && field.required) {
        errors.push(`Running number không hợp lệ: "${segmentValue}" (vị trí ${field.order + 1})`);
      } else if (!isValidRunningNumber(segmentValue)) {
        warnings.push(`Running number không hợp lệ: "${segmentValue}"`);
      }
      segmentIndex++;
    } else if (field.type === "description") {
      // Description: lấy tất cả segments còn lại
      const remainingSegments = segments.slice(segmentIndex);
      fields.push({
        type: field.type,
        value: remainingSegments.join(convention.separator)
      });
      segmentIndex = segments.length;
    } else {
      // Các field khác: building, level, discipline, content_type...
      // Luôn consume segment — keyword matching chỉ để làm giàu metadata
      if (field.keywords.length > 0) {
        const matched = matchKeyword(segmentValue, field.keywords);
        if (matched) {
          fields.push({ type: field.type, value: segmentValue, matchedKeyword: matched });
        } else {
          // Không match keyword nhưng vẫn accept giá trị thô
          fields.push({ type: field.type, value: segmentValue });
          if (field.required) {
            errors.push(
              `Trường "${field.label || field.type}" không khớp với keyword nào. Giá trị: "${segmentValue}" (vị trí ${field.order + 1})`
            );
          }
        }
      } else {
        // Không có keywords → accept bất kỳ giá trị nào
        fields.push({ type: field.type, value: segmentValue });
      }
      segmentIndex++; // Luôn consume 1 segment cho mọi field (trừ description)
    }
  }

  // Kiểm tra xem có segments thừa không → vi phạm quy tắc
  if (segmentIndex < segments.length) {
    errors.push(
      `Tên file có ${segments.length} phần nhưng quy tắc chỉ định nghĩa ${enabledFields.length} trường. Thừa: "${segments.slice(segmentIndex).join(convention.separator)}"`
    );
  }

  return {
    rawName: filename,
    fields,
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Tạo suggested format từ naming convention
 */
export const generateFormatSuggestion = (convention: NamingConventionDocument): string => {
  const enabledFields = convention.fields
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  const parts = enabledFields.map((field) => {
    const prefix = field.required ? "" : "[";
    const suffix = field.required ? "" : "]";

    let placeholder = "";
    if (field.type === "runningNumber") {
      placeholder = "001";
    } else if (field.type === "description") {
      placeholder = "Description";
    } else if (field.type === "project") {
      placeholder = "ProjectCode";
    } else {
      placeholder = field.keywords.length > 0 ? field.keywords[0].code : field.label || field.type;
    }

    return `${prefix}${placeholder}${suffix}`;
  });

  return parts.join(convention.separator);
};

/**
 * Get giá trị của một field type từ parsed result
 */
export const getFieldValue = (parsed: FlexibleParsedFilename, fieldType: string): string | undefined => {
  const field = parsed.fields.find((f) => f.type === fieldType);
  return field?.value;
};

/**
 * Get matched keyword code của một field type
 */
export const getMatchedKeywordCode = (parsed: FlexibleParsedFilename, fieldType: string): string | undefined => {
  const field = parsed.fields.find((f) => f.type === fieldType);
  return field?.matchedKeyword?.code;
};
