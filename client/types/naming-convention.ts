// Types cho Naming Convention
export type NamingFieldType =
  | "projectPrefix"
  | "building"
  | "level"
  | "discipline"
  | "drawingType"
  | "runningNumber"
  | "description";

export interface KeywordMapping {
  code: string;
  label: string;
  aliases?: string[];
}

export interface NamingField {
  type: NamingFieldType;
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

// Request types
export interface CreateNamingConventionRequest {
  projectId: string;
  separator?: string;
  fields: NamingField[];
}

export interface UpdateNamingConventionRequest {
  separator?: string;
  fields?: NamingField[];
}

export interface ValidateFilenameRequest {
  filename: string;
}
