import { NamingConventionModel } from "../naming-conventions/naming-convention.model";
import { createDefaultNamingFields } from "../naming-conventions/default-keywords";
import { parseFilenameWithConvention, getFieldValue, getMatchedKeywordCode } from "../naming-conventions/flexible-parser";
import type { FlexibleParsedFilename } from "../naming-conventions/flexible-parser";

/**
 * Parse filename using project's naming convention
 */
export const parseFilenameWithProjectConvention = async (
  filename: string,
  projectId: string
): Promise<FlexibleParsedFilename | null> => {
  try {
    // Load naming convention for project
    let convention = await NamingConventionModel.findOne({ projectId });

    // If no convention, use default
    if (!convention) {
      convention = new NamingConventionModel({
        projectId,
        separator: "-",
        fields: createDefaultNamingFields(),
        createdBy: projectId // Placeholder, will be set properly when saved
      });
    }

    // Parse filename
    const parsed = parseFilenameWithConvention(filename, convention);

    return parsed;
  } catch (error) {
    console.error("Error parsing filename with naming convention:", error);
    return null;
  }
};

/**
 * Extract metadata từ FlexibleParsedFilename để dùng cho auto-classify
 */
export const extractMetadataFromParsed = (parsed: FlexibleParsedFilename) => {
  return {
    // Hỗ trợ cả legacy field types và CMS scope field types.
    projectCode:
      getMatchedKeywordCode(parsed, "project") ||
      getFieldValue(parsed, "project") ||
      getMatchedKeywordCode(parsed, "projectPrefix") ||
      getFieldValue(parsed, "projectPrefix"),
    buildingCode: getMatchedKeywordCode(parsed, "building") || getFieldValue(parsed, "building"),
    levelCode:
      getMatchedKeywordCode(parsed, "level") ||
      getFieldValue(parsed, "level") ||
      getMatchedKeywordCode(parsed, "floor") ||
      getFieldValue(parsed, "floor"),
    floorCode: getMatchedKeywordCode(parsed, "floor") || getFieldValue(parsed, "floor"),
    disciplineCode: getMatchedKeywordCode(parsed, "discipline") || getFieldValue(parsed, "discipline"),
    drawingTypeCode:
      getMatchedKeywordCode(parsed, "content_type") ||
      getFieldValue(parsed, "content_type") ||
      getMatchedKeywordCode(parsed, "drawingType") ||
      getFieldValue(parsed, "drawingType"),
    numberCode: getFieldValue(parsed, "runningNumber"),
    freeText: getFieldValue(parsed, "description"),
    unitCode: getMatchedKeywordCode(parsed, "originator") || getFieldValue(parsed, "originator"),
    buildingPartCode:
      getMatchedKeywordCode(parsed, "volume") ||
      getFieldValue(parsed, "volume") ||
      getMatchedKeywordCode(parsed, "zone") ||
      getFieldValue(parsed, "zone"),
    fileTypeCode: getMatchedKeywordCode(parsed, "file_type") || getFieldValue(parsed, "file_type")
  };
};
