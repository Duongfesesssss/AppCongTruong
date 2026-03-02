/**
 * IFC File Validator
 * Validates IFC files by checking file signatures and basic structure
 * Similar to "memorybank" validation approach from ifc-simple-viewer
 */

export type IfcValidationResult = {
  valid: boolean;
  schema?: string; // IFC2X3, IFC4, IFC4X3, etc.
  errors?: string[];
  warnings?: string[];
  containsBuildingElements?: boolean;
  elementCount?: number;
};

/**
 * IFC file signatures (magic bytes)
 * IFC files are plain text files that start with "ISO-10303-21;"
 */
const IFC_SIGNATURES = {
  // Standard IFC text signature
  TEXT: Buffer.from("ISO-10303-21;", "utf-8"),
  // Some IFC files may have BOM
  TEXT_WITH_BOM: Buffer.from("\ufeffISO-10303-21;", "utf-8")
};

/**
 * Known IFC schema versions
 */
const IFC_SCHEMA_PATTERNS = [
  /FILE_SCHEMA\s*\(\s*\(\s*['"]IFC2X3['"]/i,
  /FILE_SCHEMA\s*\(\s*\(\s*['"]IFC4['"]/i,
  /FILE_SCHEMA\s*\(\s*\(\s*['"]IFC4X3['"]/i,
  /FILE_SCHEMA\s*\(\s*\(\s*['"]IFC4X3_ADD2['"]/i,
  /FILE_SCHEMA\s*\(\s*\(\s*['"]IFC2X2['"]/i
];

/**
 * Check if buffer starts with IFC signature
 */
const hasIfcSignature = (buffer: Buffer): boolean => {
  if (buffer.length < 20) return false;

  // Check standard signature
  const header = buffer.slice(0, 20);
  if (header.indexOf(IFC_SIGNATURES.TEXT) === 0) return true;

  // Check with BOM
  const headerStr = header.toString("utf-8");
  return headerStr.startsWith("ISO-10303-21;") || headerStr.startsWith("\ufeffISO-10303-21;");
};

/**
 * Extract IFC schema version from file content
 */
const extractIfcSchema = (content: string): string | undefined => {
  for (const pattern of IFC_SCHEMA_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      // Extract schema name from match
      const schemaMatch = match[0].match(/['"]([^'"]+)['"]/);
      return schemaMatch ? schemaMatch[1].toUpperCase() : undefined;
    }
  }
  return undefined;
};

/**
 * Count building elements in IFC file (rough estimate)
 */
const countBuildingElements = (content: string): number => {
  // Count major building element types
  const buildingElementTypes = [
    "IFCWALL",
    "IFCSLAB",
    "IFCBEAM",
    "IFCCOLUMN",
    "IFCDOOR",
    "IFCWINDOW",
    "IFCSTAIR",
    "IFCROOF",
    "IFCFURNISHINGELEMENT",
    "IFCBUILDINGELEMENTPROXY"
  ];

  let count = 0;
  for (const elementType of buildingElementTypes) {
    const regex = new RegExp(elementType, "gi");
    const matches = content.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
};

/**
 * Validate IFC file from buffer
 * @param buffer - File buffer to validate
 * @param checkContent - If true, parse content for deeper validation (slower)
 * @returns Validation result
 */
export const validateIfcFile = async (
  buffer: Buffer,
  checkContent = true
): Promise<IfcValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file signature
  if (!hasIfcSignature(buffer)) {
    errors.push("File does not have valid IFC signature (must start with ISO-10303-21;)");
    return {
      valid: false,
      errors
    };
  }

  // If only signature check, return early
  if (!checkContent) {
    return {
      valid: true,
      schema: undefined
    };
  }

  // Parse content for deeper validation
  try {
    // Convert to string (IFC files are text-based)
    // Only read first 50KB for performance (header + some content)
    const sampleSize = Math.min(buffer.length, 50 * 1024);
    const content = buffer.slice(0, sampleSize).toString("utf-8");

    // Check for required sections
    if (!content.includes("HEADER;")) {
      errors.push("Missing HEADER section");
    }

    if (!content.includes("DATA;")) {
      errors.push("Missing DATA section");
    }

    if (!content.includes("ENDSEC;")) {
      warnings.push("Missing ENDSEC markers (file may be incomplete)");
    }

    // Extract schema
    const schema = extractIfcSchema(content);

    // Count building elements
    const elementCount = countBuildingElements(content);
    const containsBuildingElements = elementCount > 0;

    if (elementCount === 0) {
      warnings.push("No building elements found in sample (file may be empty or non-architectural)");
    }

    return {
      valid: errors.length === 0,
      schema,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      containsBuildingElements,
      elementCount
    };
  } catch (error) {
    errors.push(`Failed to parse IFC content: ${error instanceof Error ? error.message : "Unknown error"}`);
    return {
      valid: false,
      errors
    };
  }
};

/**
 * Quick validation - only checks signature
 */
export const quickValidateIfc = (buffer: Buffer): boolean => {
  return hasIfcSignature(buffer);
};

/**
 * Validate IFC file from file path (for disk storage)
 */
export const validateIfcFilePath = async (filePath: string): Promise<IfcValidationResult> => {
  const fs = await import("node:fs/promises");

  try {
    // Read first 50KB for validation
    const fileHandle = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(50 * 1024);
    const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, 0);
    await fileHandle.close();

    const actualBuffer = buffer.slice(0, bytesRead);
    return validateIfcFile(actualBuffer, true);
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`]
    };
  }
};
