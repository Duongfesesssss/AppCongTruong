import type { KeywordMapping } from "./naming-convention.model";

// Discipline keywords - dựa trên client/constants/drawing-meta.ts và filename-parser.ts
export const DEFAULT_DISCIPLINE_KEYWORDS: KeywordMapping[] = [
  { code: "ARC", label: "Kiến trúc", aliases: ["AR", "ARCH"] },
  { code: "STR", label: "Kết cấu", aliases: ["ST", "STRUCT"] },
  { code: "ELT", label: "Điện", aliases: ["EL", "ELEC"] },
  { code: "HZG", label: "Sưởi ấm (Heizung)", aliases: ["HZ", "HEAT"] },
  { code: "SAN", label: "Cấp thoát nước (Sanitär)", aliases: ["SA", "SANIT"] },
  { code: "RLT", label: "Thông gió (Lüftung)", aliases: ["RL", "VENT"] },
  { code: "KLT", label: "Lạnh (Kälte)", aliases: ["KL", "COOL"] },
  { code: "SPR", label: "Sprinkler", aliases: ["SP", "SPRINK"] },
  { code: "BRS", label: "Phòng cháy (Brandschutz)", aliases: ["BR", "FIRE", "FP"] },
  { code: "ELK", label: "Điện nhẹ", aliases: ["EK"] },
  { code: "PLB", label: "Ống nước", aliases: ["PL", "PLUMB"] },
  // From filename-parser.ts
  { code: "AA", label: "Architecture (AA)" },
  { code: "AR", label: "Architecture" },
  { code: "ES", label: "Electrical Systems" },
  { code: "EM", label: "Electrical MEP" },
  { code: "ME", label: "Mechanical Electrical" },
  { code: "EP", label: "Electrical Power" },
  { code: "EF", label: "Electrical Fire" },
  { code: "HV", label: "HVAC" },
  { code: "LUF", label: "Lüftung (Ventilation)" },
  { code: "IN", label: "Interior" },
  { code: "LA", label: "Landscape" },
  { code: "KT", label: "Kiến trúc (Vietnamese)", aliases: ["KIENTRUC"] },
  { code: "KC", label: "Kết cấu (Vietnamese)", aliases: ["KETCAU"] },
  { code: "D", label: "Điện (Vietnamese)", aliases: ["DIEN"] },
  { code: "MEP", label: "MEP Systems" }
];

// Drawing Type keywords - dựa trên client/constants/drawing-meta.ts và filename-parser.ts
export const DEFAULT_DRAWING_TYPE_KEYWORDS: KeywordMapping[] = [
  { code: "GR", label: "Mặt bằng (Grundriss)", aliases: ["GRUNDRISS", "FLOOR"] },
  { code: "SC", label: "Sơ đồ (Schema)", aliases: ["SCHEMA", "SCH"] },
  { code: "DT", label: "Chi tiết (Detail)", aliases: ["DETAIL", "DET"] },
  { code: "SN", label: "Mặt cắt (Schnitt)", aliases: ["SCHNITT", "SECTION"] },
  { code: "AN", label: "Mặt đứng (Ansicht)", aliases: ["ANSICHT", "ELEVATION"] },
  { code: "LP", label: "Tổng mặt bằng (Lageplan)", aliases: ["LAGEPLAN", "SITE"] },
  { code: "MO", label: "Lắp đặt (Montage)", aliases: ["MONTAGE", "ASSEMBLY"] },
  { code: "SD", label: "Xuyên tường (Durchbruch)", aliases: ["DURCHBRUCH", "OPENING"] },
  { code: "SP", label: "Sơ đồ nguyên lý (Prinzip)", aliases: ["PRINZIP", "PRINCIPLE"] },
  { code: "IS", label: "Isometrie", aliases: ["ISO", "ISOMETRIC"] },
  // From filename-parser.ts
  { code: "M2", label: "M2 Type" },
  { code: "M3", label: "M3 Type" },
  { code: "DR", label: "Drawing" },
  { code: "SH", label: "Sheet" },
  { code: "SM", label: "Schema/Model" },
  { code: "KP", label: "Kabelplan" },
  { code: "MB", label: "Mặt bằng (Vietnamese)", aliases: ["MATBANG"] },
  { code: "MC", label: "Mặt cắt (Vietnamese)", aliases: ["MATCAT"] },
  { code: "MD", label: "Mặt đứng (Vietnamese)", aliases: ["MATDUNG"] }
];

// Level/Floor keywords - dựa trên client/constants/drawing-meta.ts và filename-parser.ts
export const DEFAULT_LEVEL_KEYWORDS: KeywordMapping[] = [
  { code: "KG2", label: "Tầng hầm 2 (2.Keller)", aliases: ["B2", "BASEMENT2"] },
  { code: "KG", label: "Tầng hầm (Keller)", aliases: ["B1", "BASEMENT", "UG"] },
  { code: "EG", label: "Tầng trệt (Erdgeschoss)", aliases: ["GF", "GROUND"] },
  { code: "1OG", label: "Tầng 1 (1.Obergeschoss)", aliases: ["L1", "FL01", "LEVEL01", "OG1"] },
  { code: "2OG", label: "Tầng 2", aliases: ["L2", "FL02", "LEVEL02", "OG2"] },
  { code: "3OG", label: "Tầng 3", aliases: ["L3", "FL03", "LEVEL03", "OG3"] },
  { code: "4OG", label: "Tầng 4", aliases: ["L4", "FL04", "LEVEL04", "OG4"] },
  { code: "5OG", label: "Tầng 5", aliases: ["L5", "FL05", "LEVEL05", "OG5"] },
  { code: "ZD", label: "Tầng kỹ thuật (Zwischendach)", aliases: ["MZ", "MEZ", "MEZZANINE"] },
  { code: "DA", label: "Mái (Dach)", aliases: ["RF", "ROOF"] },
  { code: "ALL", label: "Toàn bộ (Alle Geschosse)", aliases: ["ZZ"] },
  { code: "DG", label: "Dachgeschoss (Roof floor)" },
  { code: "LA01", label: "Level A 01", aliases: ["LA1"] },
  { code: "LA02", label: "Level A 02", aliases: ["LA2"] }
];

// Building/Zone keywords - dựa trên filename-parser.ts
export const DEFAULT_BUILDING_KEYWORDS: KeywordMapping[] = [
  { code: "KS", label: "Krankenhaus (Hospital)" },
  { code: "TM", label: "Tower Main" },
  { code: "VP", label: "Verwaltung/Parking" },
  { code: "NT", label: "North Tower" },
  { code: "SH", label: "South Hall" },
  { code: "HQ", label: "Headquarters", aliases: ["MAIN"] },
  { code: "A", label: "Building A", aliases: ["BLOCK-A"] },
  { code: "B", label: "Building B", aliases: ["BLOCK-B"] },
  { code: "C", label: "Building C", aliases: ["BLOCK-C"] }
];

// Building Part/Volume keywords - dựa trên filename-parser.ts
export const DEFAULT_BUILDING_PART_KEYWORDS: KeywordMapping[] = [
  { code: "BS", label: "Basement" },
  { code: "PO", label: "Podium" },
  { code: "TY", label: "Tower/Typical" },
  { code: "XO", label: "Extension/Annex" },
  { code: "GR", label: "Ground" },
  { code: "GRU", label: "Grundriss" },
  { code: "SE", label: "Section" },
  { code: "AN", label: "Ansicht" },
  { code: "AS", label: "Assembly" }
];

// Originator/Unit keywords - dựa trên filename-parser.ts
export const DEFAULT_ORIGINATOR_KEYWORDS: KeywordMapping[] = [
  { code: "A79", label: "A79 Company" },
  { code: "SDE", label: "SDE Company" },
  { code: "CON", label: "Contractor" },
  { code: "EDE", label: "EDE Company" },
  { code: "BRL", label: "BRL Company" }
];

// Tạo default field configuration
export const createDefaultNamingFields = () => {
  return [
    {
      type: "projectPrefix" as const,
      order: 0,
      enabled: true,
      required: true,
      keywords: []
    },
    {
      type: "building" as const,
      order: 1,
      enabled: true,
      required: true,
      keywords: DEFAULT_BUILDING_KEYWORDS
    },
    {
      type: "level" as const,
      order: 2,
      enabled: true,
      required: true,
      keywords: DEFAULT_LEVEL_KEYWORDS
    },
    {
      type: "discipline" as const,
      order: 3,
      enabled: true,
      required: true,
      keywords: DEFAULT_DISCIPLINE_KEYWORDS
    },
    {
      type: "drawingType" as const,
      order: 4,
      enabled: true,
      required: false,
      keywords: DEFAULT_DRAWING_TYPE_KEYWORDS
    },
    {
      type: "runningNumber" as const,
      order: 5,
      enabled: true,
      required: false,
      keywords: []
    },
    {
      type: "description" as const,
      order: 6,
      enabled: false,
      required: false,
      keywords: []
    }
  ];
};
