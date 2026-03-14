// Types cho Naming Convention
// type là bất kỳ string nào: CMS scope ("discipline","building","level","project",...)
// hoặc custom label do người dùng tự đặt
export type NamingFieldType = string;

// Các predefined scopes (dùng làm gợi ý trong UI khi assign tag)
export const PREDEFINED_TAG_SCOPES = [
  { type: "project", label: "Mã dự án" },
  { type: "originator", label: "Người tạo / Nhà thầu" },
  { type: "building", label: "Tòa nhà / Khu" },
  { type: "volume", label: "Volume / Khối" },
  { type: "zone", label: "Khu vực" },
  { type: "level", label: "Tầng" },
  { type: "room", label: "Phòng" },
  { type: "discipline", label: "Bộ môn" },
  { type: "content_type", label: "Loại bản vẽ" },
  { type: "file_type", label: "Loại file" },
  { type: "grid_axis", label: "Trục lưới" },
  { type: "runningNumber", label: "Số thứ tự" },
  { type: "description", label: "Mô tả" },
  { type: "custom", label: "Tùy chỉnh..." }
] as const;

export interface KeywordMapping {
  code: string;
  label: string;
  aliases?: string[];
}

export interface NamingField {
  type: string;        // Bất kỳ string nào (scope hoặc custom label)
  label?: string;      // Tên hiển thị của trường (optional)
  order: number;
  enabled: boolean;
  required: boolean;
  keywords: KeywordMapping[];
}

export interface NamingConvention {
  _id?: string;
  projectId: string;
  separator: string;
  fields: NamingField[];
  exampleFilename?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isDefault?: boolean; // True nếu là default config chưa save
}

export interface ParsedField {
  type: string;
  value: string;
  matchedKeyword?: KeywordMapping;
}

export interface FlexibleParsedFilename {
  rawName: string;
  fields: ParsedField[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidateFilenameResponse {
  filename: string;
  parsed: FlexibleParsedFilename;
  suggestedFormat: string;
  convention: {
    separator: string;
    fields: NamingField[];
  };
}

export interface FormatSuggestionResponse {
  format: string;
  separator: string;
  fields: NamingField[];
}

// Response từ endpoint parse-filename
export interface ParseFilenameResponse {
  filename: string;
  nameWithoutExt: string;
  detectedSeparator: string;
  segments: string[];
}

// Request types
export interface CreateNamingConventionRequest {
  projectId: string;
  separator?: string;
  fields: NamingField[];
  exampleFilename?: string;
}

export interface UpdateNamingConventionRequest {
  separator?: string;
  fields?: NamingField[];
}

export interface ValidateFilenameRequest {
  filename: string;
}
