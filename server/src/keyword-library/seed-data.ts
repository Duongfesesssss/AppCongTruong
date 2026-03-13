import type { KeywordLibraryFieldType } from "./keyword-library.model";

export type SeedKeyword = {
  fieldType: KeywordLibraryFieldType;
  code: string;
  label: string;
  aliases?: string[];
};

// ============================================================
// DISCIPLINE — từ huongdanbanve + constants/drawing-meta.ts
// ============================================================
export const SEED_DISCIPLINES: SeedKeyword[] = [
  // Từ huongdanbanve (Name List.xlsx)
  { fieldType: "discipline", code: "ARC", label: "Kiến trúc (Architecture)", aliases: ["AR", "ARCH", "AA"] },
  { fieldType: "discipline", code: "TGE", label: "Kỹ thuật công trình (Technische Gebäudeausrüstung)", aliases: ["TGA", "MEP"] },
  { fieldType: "discipline", code: "ELT", label: "Điện (Elektrotechnik)", aliases: ["EL", "ELEC", "ES", "EP", "EF"] },
  { fieldType: "discipline", code: "HK", label: "Sưởi ấm & Lạnh (Heizung/Kälte)", aliases: ["HZG", "HZ", "KLT"] },
  { fieldType: "discipline", code: "HH", label: "Sưởi ấm (Heizung)", aliases: ["HZG"] },
  { fieldType: "discipline", code: "HL", label: "Thông gió (Heizung/Lüftung)", aliases: ["RLT", "LUF", "VENT"] },
  { fieldType: "discipline", code: "HS", label: "Cấp thoát nước & Sưởi (Heizung/Sanitär)", aliases: ["SAN", "SA"] },
  { fieldType: "discipline", code: "EN", label: "Điện nhẹ / Điều khiển (Elektronik)", aliases: ["ELK", "EK"] },
  // Từ drawing-meta.ts
  { fieldType: "discipline", code: "STR", label: "Kết cấu (Struktur)", aliases: ["ST", "STRUCT", "KC", "KETCAU"] },
  { fieldType: "discipline", code: "SAN", label: "Cấp thoát nước (Sanitär)", aliases: ["PLB", "PL", "PLUMB"] },
  { fieldType: "discipline", code: "RLT", label: "Thông gió (Raumlufttechnik)", aliases: ["VENT"] },
  { fieldType: "discipline", code: "SPR", label: "Chữa cháy Sprinkler", aliases: ["SP", "SPRINK"] },
  { fieldType: "discipline", code: "BRS", label: "Phòng cháy (Brandschutz)", aliases: ["BR", "FIRE", "FP"] },
  { fieldType: "discipline", code: "KT", label: "Kiến trúc (Kiến trúc Việt Nam)", aliases: ["KIENTRUC"] },
  { fieldType: "discipline", code: "KC", label: "Kết cấu (Kết cấu Việt Nam)", aliases: ["KETCAU"] },
  { fieldType: "discipline", code: "D", label: "Điện (Điện Việt Nam)", aliases: ["DIEN"] },
  { fieldType: "discipline", code: "MEP", label: "Cơ điện lạnh (MEP Systems)", aliases: [] },
  { fieldType: "discipline", code: "HV", label: "HVAC", aliases: [] },
  { fieldType: "discipline", code: "IN", label: "Nội thất (Interior)", aliases: [] },
  { fieldType: "discipline", code: "LA", label: "Cảnh quan (Landscape)", aliases: [] },
];

// ============================================================
// DRAWING TYPE — từ huongdanbanve + constants/drawing-meta.ts
// ============================================================
export const SEED_DRAWING_TYPES: SeedKeyword[] = [
  // Từ huongdanbanve
  { fieldType: "drawingType", code: "GR", label: "Mặt bằng (Grundriss)", aliases: ["GRUNDRISS", "FLOOR", "MB", "MATBANG"] },
  { fieldType: "drawingType", code: "SN", label: "Mặt cắt (Schnitt)", aliases: ["SCHNITT", "SECTION", "MC", "MATCAT"] },
  { fieldType: "drawingType", code: "AN", label: "Mặt đứng (Ansicht)", aliases: ["ANSICHT", "ELEVATION", "MD", "MATDUNG"] },
  { fieldType: "drawingType", code: "DT", label: "Chi tiết (Detail)", aliases: ["DETAIL", "DET"] },
  { fieldType: "drawingType", code: "SC", label: "Sơ đồ nguyên lý (Schema)", aliases: ["SCHEMA", "SCH"] },
  { fieldType: "drawingType", code: "DS", label: "Sơ đồ phân phối (Distributing Schema)", aliases: [] },
  { fieldType: "drawingType", code: "AA", label: "Tổng thể (Allgemein/Ansicht All)", aliases: [] },
  { fieldType: "drawingType", code: "BR", label: "Phòng cháy (Brandschutz)", aliases: ["FIRE"] },
  { fieldType: "drawingType", code: "BL", label: "Biểu đồ (Block Layout)", aliases: [] },
  { fieldType: "drawingType", code: "DA", label: "Mái (Dach/Roof)", aliases: ["ROOF"] },
  { fieldType: "drawingType", code: "DE", label: "Chi tiết mở rộng (Detail Extension)", aliases: [] },
  { fieldType: "drawingType", code: "FE", label: "Mặt dựng (Fassade/Elevation)", aliases: ["FASSADE"] },
  { fieldType: "drawingType", code: "GB", label: "Tổng mặt bằng xây dựng (Gebäude)", aliases: [] },
  { fieldType: "drawingType", code: "GD", label: "Mặt bằng tầng điển hình (Geschoss Detail)", aliases: [] },
  { fieldType: "drawingType", code: "GL", label: "Mặt bằng tổng thể (Grundlagen)", aliases: [] },
  { fieldType: "drawingType", code: "GS", label: "Sơ đồ tổng thể (Gesamtschema)", aliases: [] },
  { fieldType: "drawingType", code: "LA", label: "Tổng mặt bằng (Lageplan)", aliases: ["LAGEPLAN", "SITE", "LP"] },
  { fieldType: "drawingType", code: "PP", label: "Nguyên lý (Prinzip/Principle)", aliases: ["PRINZIP", "PRINCIPLE", "SP"] },
  // Từ drawing-meta.ts
  { fieldType: "drawingType", code: "LP", label: "Tổng mặt bằng (Lageplan)", aliases: ["SITE"] },
  { fieldType: "drawingType", code: "MO", label: "Lắp đặt (Montage)", aliases: ["MONTAGE", "ASSEMBLY"] },
  { fieldType: "drawingType", code: "SD", label: "Xuyên tường (Durchbruch)", aliases: ["DURCHBRUCH", "OPENING"] },
  { fieldType: "drawingType", code: "IS", label: "Isometrie", aliases: ["ISO", "ISOMETRIC"] },
  { fieldType: "drawingType", code: "KP", label: "Bản đồ cáp (Kabelplan)", aliases: [] },
  { fieldType: "drawingType", code: "MB", label: "Mặt bằng (Mặt bằng Việt Nam)", aliases: ["MATBANG"] },
];

// ============================================================
// LEVEL / FLOOR — từ huongdanbanve + constants/drawing-meta.ts
// ============================================================
export const SEED_LEVELS: SeedKeyword[] = [
  // Từ huongdanbanve
  { fieldType: "level", code: "EG", label: "Tầng trệt (Erdgeschoss)", aliases: ["GF", "GROUND", "00"] },
  { fieldType: "level", code: "O1", label: "Tầng 1 (1.Obergeschoss)", aliases: ["1OG", "OG1", "L1", "FL01", "LEVEL01"] },
  { fieldType: "level", code: "O2", label: "Tầng 2 (2.Obergeschoss)", aliases: ["2OG", "OG2", "L2", "FL02"] },
  { fieldType: "level", code: "O3", label: "Tầng 3", aliases: ["3OG", "OG3", "L3", "FL03"] },
  { fieldType: "level", code: "O4", label: "Tầng 4", aliases: ["4OG", "OG4", "L4", "FL04"] },
  { fieldType: "level", code: "O5", label: "Tầng 5", aliases: ["5OG", "OG5", "L5", "FL05"] },
  { fieldType: "level", code: "O6", label: "Tầng 6", aliases: ["6OG", "OG6", "L6", "FL06"] },
  { fieldType: "level", code: "O7", label: "Tầng 7", aliases: ["7OG", "OG7", "L7", "FL07"] },
  { fieldType: "level", code: "DG", label: "Tầng mái (Dachgeschoss)", aliases: ["RF", "ROOF"] },
  { fieldType: "level", code: "DZ", label: "Tầng kỹ thuật (Zwischendach)", aliases: ["MZ", "MEZ", "MEZZANINE", "ZD"] },
  { fieldType: "level", code: "U1", label: "Tầng hầm 1 (Untergeschoss 1)", aliases: ["UG", "KG", "B1", "BASEMENT"] },
  { fieldType: "level", code: "DA", label: "Mái (Dach)", aliases: [] },
  { fieldType: "level", code: "NO", label: "Hướng Bắc (Nord)", aliases: ["NORTH"] },
  { fieldType: "level", code: "OS", label: "Hướng Đông (Ost)", aliases: ["EAST"] },
  { fieldType: "level", code: "SU", label: "Hướng Nam (Süd)", aliases: ["SOUTH"] },
  { fieldType: "level", code: "WE", label: "Hướng Tây (West)", aliases: ["WEST"] },
  { fieldType: "level", code: "AA", label: "Tất cả tầng (All/Alle)", aliases: ["ALL", "ZZ"] },
  { fieldType: "level", code: "GR", label: "Tổng (Gesamt)", aliases: [] },
  { fieldType: "level", code: "BK", label: "Block", aliases: [] },
  { fieldType: "level", code: "FU", label: "Nền (Fußboden)", aliases: [] },
  { fieldType: "level", code: "XX", label: "Không phân tầng (Tất cả)", aliases: ["ALL"] },
  // Từ drawing-meta.ts (thêm aliases)
  { fieldType: "level", code: "KG2", label: "Tầng hầm 2 (2.Keller)", aliases: ["B2", "BASEMENT2"] },
  { fieldType: "level", code: "KG", label: "Tầng hầm (Keller)", aliases: ["B1", "BASEMENT", "UG"] },
  { fieldType: "level", code: "LA01", label: "Level A 01", aliases: ["LA1"] },
  { fieldType: "level", code: "LA02", label: "Level A 02", aliases: ["LA2"] },
];

// ============================================================
// BUILDING / ZONE — từ huongdanbanve + defaults
// ============================================================
export const SEED_BUILDINGS: SeedKeyword[] = [
  // Từ huongdanbanve (Zone codes)
  { fieldType: "building", code: "SUD", label: "Khu Nam (Süd/South)", aliases: ["SOUTH", "S"] },
  { fieldType: "building", code: "UVT", label: "Khu kỹ thuật (Unterverteilung)", aliases: [] },
  { fieldType: "building", code: "ANT", label: "Khu Anten/Antenna Zone", aliases: [] },
  { fieldType: "building", code: "BLS", label: "Khu BLS", aliases: [] },
  { fieldType: "building", code: "DVK", label: "Khu DVK", aliases: [] },
  { fieldType: "building", code: "ELT", label: "Khu điện (Elektro Zone)", aliases: [] },
  { fieldType: "building", code: "FMT", label: "Khu FMT", aliases: [] },
  { fieldType: "building", code: "HZG", label: "Khu sưởi (Heizung Zone)", aliases: [] },
  { fieldType: "building", code: "KLP", label: "Khu KLP", aliases: [] },
  { fieldType: "building", code: "LEE", label: "Khu trống (Leer/Empty Zone)", aliases: [] },
  { fieldType: "building", code: "NSH", label: "Khu NSH", aliases: [] },
  { fieldType: "building", code: "RLT", label: "Khu thông gió (RLT Zone)", aliases: [] },
  { fieldType: "building", code: "SAN", label: "Khu vệ sinh (Sanitär Zone)", aliases: [] },
  { fieldType: "building", code: "SOB", label: "Khu SOB", aliases: [] },
  { fieldType: "building", code: "SPR", label: "Khu Sprinkler", aliases: [] },
  { fieldType: "building", code: "ZG", label: "Khu trung tâm (Zentralgebäude)", aliases: [] },
  { fieldType: "building", code: "XXX", label: "Toàn công trình (Gesamt)", aliases: ["ALL", "GENERAL"] },
  // Từ default-keywords.ts (building codes)
  { fieldType: "building", code: "KS", label: "Bệnh viện (Krankenhaus)", aliases: [] },
  { fieldType: "building", code: "TM", label: "Tháp chính (Tower Main)", aliases: [] },
  { fieldType: "building", code: "VP", label: "Văn phòng/Bãi xe (Verwaltung/Parking)", aliases: [] },
  { fieldType: "building", code: "NT", label: "Tháp Bắc (North Tower)", aliases: [] },
  { fieldType: "building", code: "SH", label: "Hội trường Nam (South Hall)", aliases: [] },
  { fieldType: "building", code: "HQ", label: "Trụ sở chính (Headquarters)", aliases: ["MAIN"] },
  { fieldType: "building", code: "A", label: "Tòa A (Building A)", aliases: ["BLOCK-A"] },
  { fieldType: "building", code: "B", label: "Tòa B (Building B)", aliases: ["BLOCK-B"] },
  { fieldType: "building", code: "C", label: "Tòa C (Building C)", aliases: ["BLOCK-C"] },
];

// ============================================================
// BUILDING PART / VOLUME — từ huongdanbanve
// ============================================================
export const SEED_BUILDING_PARTS: SeedKeyword[] = [
  { fieldType: "buildingPart", code: "A", label: "Phân khu A", aliases: [] },
  { fieldType: "buildingPart", code: "B", label: "Phân khu B", aliases: [] },
  { fieldType: "buildingPart", code: "C", label: "Phân khu C", aliases: [] },
  { fieldType: "buildingPart", code: "E", label: "Phân khu E (Erweiterung/Extension)", aliases: [] },
];

export const SEED_VOLUMES: SeedKeyword[] = [
  { fieldType: "volume", code: "BT1", label: "Khối 1 (Bauteil 1)", aliases: [] },
  { fieldType: "volume", code: "BT2", label: "Khối 2 (Bauteil 2)", aliases: [] },
  { fieldType: "volume", code: "BT3", label: "Khối 3 (Bauteil 3)", aliases: [] },
  { fieldType: "volume", code: "XXX", label: "Chung (Gesamt/All)", aliases: [] },
  { fieldType: "volume", code: "BS", label: "Tầng hầm (Basement)", aliases: [] },
  { fieldType: "volume", code: "PO", label: "Podium", aliases: [] },
  { fieldType: "volume", code: "TY", label: "Tầng điển hình (Typical)", aliases: [] },
  { fieldType: "volume", code: "XO", label: "Phần mở rộng (Extension/Annex)", aliases: [] },
];

// ============================================================
// ORIGINATOR / ĐƠN VỊ — từ huongdanbanve
// ============================================================
export const SEED_ORIGINATORS: SeedKeyword[] = [
  { fieldType: "originator", code: "IBE", label: "IBE Engineering", aliases: [] },
  { fieldType: "originator", code: "IBE-API", label: "IBE x API Joint", aliases: [] },
  { fieldType: "originator", code: "SuP", label: "SuP Architects", aliases: [] },
  { fieldType: "originator", code: "SuP-API", label: "SuP x API Joint", aliases: [] },
  { fieldType: "originator", code: "API", label: "API Company", aliases: [] },
  { fieldType: "originator", code: "IBE-AGE", label: "IBE x AGE Joint", aliases: [] },
  { fieldType: "originator", code: "LN", label: "LN Studio", aliases: [] },
  { fieldType: "originator", code: "A79", label: "A79 Architecture", aliases: [] },
  { fieldType: "originator", code: "SDE", label: "SDE Engineering", aliases: [] },
  { fieldType: "originator", code: "CON", label: "Contractor", aliases: [] },
  { fieldType: "originator", code: "EDE", label: "EDE Company", aliases: [] },
  { fieldType: "originator", code: "BRL", label: "BRL Company", aliases: [] },
];

// ============================================================
// STATUS / REVISION — từ huongdanbanve
// ============================================================
export const SEED_STATUSES: SeedKeyword[] = [
  { fieldType: "status", code: "0vi-P", label: "Phát hành lần 0 (0th issue, Planning)", aliases: [] },
  { fieldType: "status", code: "1vi-P", label: "Phát hành lần 1 (1st issue, Planning)", aliases: [] },
  { fieldType: "status", code: "2vi-P", label: "Phát hành lần 2 (2nd issue, Planning)", aliases: [] },
  { fieldType: "status", code: "3vi-P", label: "Phát hành lần 3 (3rd issue, Planning)", aliases: [] },
  { fieldType: "status", code: "1vi-S", label: "Phát hành lần 1 (Construction/Ausführung)", aliases: [] },
  { fieldType: "status", code: "2vi-S", label: "Phát hành lần 2 (Construction/Ausführung)", aliases: [] },
  { fieldType: "status", code: "Abf-P", label: "Bản cuối (Final/Abschluss)", aliases: [] },
  { fieldType: "status", code: "IBO", label: "Bản phối hợp (IBE Office)", aliases: [] },
  { fieldType: "status", code: "WP", label: "Bản làm việc (Work-in-Progress)", aliases: [] },
  { fieldType: "status", code: "1-M100", label: "Rev 1, tỷ lệ 1:100", aliases: [] },
  { fieldType: "status", code: "3-M100", label: "Rev 3, tỷ lệ 1:100", aliases: [] },
];

// ============================================================
// TẤT CẢ SEED DATA
// ============================================================
export const ALL_SEED_KEYWORDS: SeedKeyword[] = [
  ...SEED_DISCIPLINES,
  ...SEED_DRAWING_TYPES,
  ...SEED_LEVELS,
  ...SEED_BUILDINGS,
  ...SEED_BUILDING_PARTS,
  ...SEED_VOLUMES,
  ...SEED_ORIGINATORS,
  ...SEED_STATUSES,
];
