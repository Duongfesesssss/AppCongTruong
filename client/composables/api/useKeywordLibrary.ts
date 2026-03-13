import { useApi } from "~/composables/api/useApi";

export type KeywordLibraryFieldType =
  | "discipline"
  | "building"
  | "level"
  | "drawingType"
  | "originator"
  | "buildingPart"
  | "volume"
  | "status";

export type KeywordLibraryItem = {
  _id: string;
  fieldType: KeywordLibraryFieldType;
  code: string;
  label: string;
  aliases: string[];
  source: "system" | "user";
  createdAt?: string;
};

// Map từ NamingFieldType sang KeywordLibraryFieldType
export const namingFieldToLibraryField: Record<string, KeywordLibraryFieldType | null> = {
  discipline: "discipline",
  building: "building",
  level: "level",
  drawingType: "drawingType",
  projectPrefix: null,
  runningNumber: null,
  description: null
};

export const useKeywordLibrary = () => {
  const api = useApi();

  const getKeywords = async (fieldType?: KeywordLibraryFieldType): Promise<KeywordLibraryItem[]> => {
    const query = fieldType ? `?fieldType=${fieldType}` : "";
    return api.get<KeywordLibraryItem[]>(`/keyword-library${query}`);
  };

  const addKeyword = async (data: {
    fieldType: KeywordLibraryFieldType;
    code: string;
    label: string;
    aliases?: string[];
  }): Promise<KeywordLibraryItem> => {
    return api.post<KeywordLibraryItem>("/keyword-library", data);
  };

  const updateKeyword = async (
    id: string,
    data: { label?: string; aliases?: string[] }
  ): Promise<KeywordLibraryItem> => {
    return api.put<KeywordLibraryItem>(`/keyword-library/${id}`, data);
  };

  const deleteKeyword = async (id: string): Promise<void> => {
    await api.delete(`/keyword-library/${id}`);
  };

  return { getKeywords, addKeyword, updateKeyword, deleteKeyword };
};
