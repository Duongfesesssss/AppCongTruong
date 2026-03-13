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
    buildingCode: getMatchedKeywordCode(parsed, "building") || getFieldValue(parsed, "building"),
    levelCode: getMatchedKeywordCode(parsed, "level") || getFieldValue(parsed, "level"),
    disciplineCode: getMatchedKeywordCode(parsed, "discipline") || getFieldValue(parsed, "discipline"),
    drawingTypeCode: getMatchedKeywordCode(parsed, "drawingType") || getFieldValue(parsed, "drawingType"),
    runningNumber: getFieldValue(parsed, "runningNumber"),
    description: getFieldValue(parsed, "description"),
    projectPrefix: getFieldValue(parsed, "projectPrefix")
  };
};
