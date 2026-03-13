import { describe, it, expect } from "vitest";
import { parseFilenameWithConvention, generateFormatSuggestion, getFieldValue } from "./flexible-parser";
import type { NamingConventionDocument } from "./naming-convention.model";
import { Types } from "mongoose";

describe("Flexible Parser", () => {
  const mockConvention: NamingConventionDocument = {
    projectId: new Types.ObjectId(),
    separator: "-",
    fields: [
      {
        type: "projectPrefix",
        order: 0,
        enabled: true,
        required: true,
        keywords: []
      },
      {
        type: "building",
        order: 1,
        enabled: true,
        required: true,
        keywords: [
          { code: "HQ", label: "Headquarters", aliases: ["MAIN"] },
          { code: "A", label: "Building A" }
        ]
      },
      {
        type: "level",
        order: 2,
        enabled: true,
        required: true,
        keywords: [
          { code: "L1", label: "Level 1", aliases: ["FL01", "LEVEL01"] },
          { code: "L2", label: "Level 2", aliases: ["FL02", "LEVEL02"] }
        ]
      },
      {
        type: "discipline",
        order: 3,
        enabled: true,
        required: true,
        keywords: [
          { code: "ARC", label: "Architecture", aliases: ["KT", "ARCH"] },
          { code: "STR", label: "Structure", aliases: ["KC"] }
        ]
      },
      {
        type: "drawingType",
        order: 4,
        enabled: true,
        required: false,
        keywords: [
          { code: "GR", label: "Grundriss", aliases: ["MB"] },
          { code: "SC", label: "Schema" }
        ]
      },
      {
        type: "runningNumber",
        order: 5,
        enabled: true,
        required: false,
        keywords: []
      }
    ],
    createdBy: new Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe("parseFilenameWithConvention", () => {
    it("should parse valid filename correctly", () => {
      const filename = "ABC-HQ-L1-KT-MB-003.pdf";
      const result = parseFilenameWithConvention(filename, mockConvention);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fields).toHaveLength(6);

      // Check projectPrefix
      const projectField = result.fields.find((f) => f.type === "projectPrefix");
      expect(projectField?.value).toBe("ABC");

      // Check building with keyword match
      const buildingField = result.fields.find((f) => f.type === "building");
      expect(buildingField?.value).toBe("HQ");
      expect(buildingField?.matchedKeyword?.code).toBe("HQ");

      // Check level with keyword match
      const levelField = result.fields.find((f) => f.type === "level");
      expect(levelField?.value).toBe("L1");
      expect(levelField?.matchedKeyword?.code).toBe("L1");

      // Check discipline with alias match
      const disciplineField = result.fields.find((f) => f.type === "discipline");
      expect(disciplineField?.value).toBe("KT");
      expect(disciplineField?.matchedKeyword?.code).toBe("ARC"); // KT is alias of ARC

      // Check drawingType with alias match
      const drawingTypeField = result.fields.find((f) => f.type === "drawingType");
      expect(drawingTypeField?.value).toBe("MB");
      expect(drawingTypeField?.matchedKeyword?.code).toBe("GR"); // MB is alias of GR

      // Check running number
      const numberField = result.fields.find((f) => f.type === "runningNumber");
      expect(numberField?.value).toBe("003");
    });

    it("should detect missing required field", () => {
      const filename = "ABC-HQ-KT-MB-003.pdf"; // Missing level
      const result = parseFilenameWithConvention(filename, mockConvention);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("level");
    });

    it("should handle keyword not matching", () => {
      const filename = "ABC-UNKNOWN-L1-KT-MB-003.pdf"; // UNKNOWN building code
      const result = parseFilenameWithConvention(filename, mockConvention);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("building"))).toBe(true);
    });

    it("should work with alias keywords", () => {
      const filename = "ABC-MAIN-FL01-ARCH-GR-003.pdf"; // Using aliases
      const result = parseFilenameWithConvention(filename, mockConvention);

      expect(result.isValid).toBe(true);

      const buildingField = result.fields.find((f) => f.type === "building");
      expect(buildingField?.matchedKeyword?.code).toBe("HQ"); // MAIN is alias of HQ

      const levelField = result.fields.find((f) => f.type === "level");
      expect(levelField?.matchedKeyword?.code).toBe("L1"); // FL01 is alias of L1

      const disciplineField = result.fields.find((f) => f.type === "discipline");
      expect(disciplineField?.matchedKeyword?.code).toBe("ARC"); // ARCH is alias of ARC
    });

    it("should handle optional fields", () => {
      const filename = "ABC-HQ-L1-KT.pdf"; // No drawingType and runningNumber
      const result = parseFilenameWithConvention(filename, mockConvention);

      expect(result.isValid).toBe(true);
      expect(result.fields).toHaveLength(4); // Only required fields
    });
  });

  describe("generateFormatSuggestion", () => {
    it("should generate correct format suggestion", () => {
      const suggestion = generateFormatSuggestion(mockConvention);

      // Should include enabled fields with examples
      expect(suggestion).toContain("ABC"); // projectPrefix example
      expect(suggestion).toContain("HQ"); // building example (first keyword)
      expect(suggestion).toContain("L1"); // level example (first keyword)
      expect(suggestion).toContain("ARC"); // discipline example (first keyword)

      // Should use correct separator
      expect(suggestion.split("-").length).toBeGreaterThan(1);
    });

    it("should mark optional fields correctly", () => {
      const suggestion = generateFormatSuggestion(mockConvention);

      // Optional fields should be in brackets
      // Since drawingType and runningNumber are optional
      // The suggestion should show them as optional
      expect(suggestion).toMatch(/\[.*\]/); // At least one optional field
    });
  });

  describe("getFieldValue", () => {
    it("should extract field value correctly", () => {
      const filename = "ABC-HQ-L1-KT-MB-003.pdf";
      const parsed = parseFilenameWithConvention(filename, mockConvention);

      expect(getFieldValue(parsed, "projectPrefix")).toBe("ABC");
      expect(getFieldValue(parsed, "building")).toBe("HQ");
      expect(getFieldValue(parsed, "level")).toBe("L1");
      expect(getFieldValue(parsed, "discipline")).toBe("KT");
      expect(getFieldValue(parsed, "drawingType")).toBe("MB");
      expect(getFieldValue(parsed, "runningNumber")).toBe("003");
    });

    it("should return undefined for missing field", () => {
      const filename = "ABC-HQ-L1-KT.pdf"; // No drawingType
      const parsed = parseFilenameWithConvention(filename, mockConvention);

      expect(getFieldValue(parsed, "drawingType")).toBeUndefined();
      expect(getFieldValue(parsed, "runningNumber")).toBeUndefined();
    });
  });
});
