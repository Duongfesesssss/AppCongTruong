import type {
  NamingConvention,
  CreateNamingConventionRequest,
  UpdateNamingConventionRequest,
  ValidateFilenameRequest,
  ValidateFilenameResponse,
  FormatSuggestionResponse,
  ParseFilenameResponse
} from "~/types/naming-convention";
import { useApi } from "~/composables/api/useApi";

export const useNamingConvention = () => {
  const api = useApi();

  const getNamingConvention = async (projectId: string): Promise<NamingConvention> => {
    return api.get<NamingConvention>(`/naming-conventions/${projectId}`);
  };

  const createOrUpdateNamingConvention = async (
    data: CreateNamingConventionRequest
  ): Promise<NamingConvention> => {
    return api.post<NamingConvention>("/naming-conventions", data);
  };

  const updateNamingConvention = async (
    projectId: string,
    data: UpdateNamingConventionRequest
  ): Promise<NamingConvention> => {
    return api.put<NamingConvention>(`/naming-conventions/${projectId}`, data);
  };

  const deleteNamingConvention = async (projectId: string): Promise<void> => {
    await api.delete(`/naming-conventions/${projectId}`);
  };

  const validateFilename = async (
    projectId: string,
    data: ValidateFilenameRequest
  ): Promise<ValidateFilenameResponse> => {
    return api.post<ValidateFilenameResponse>(`/naming-conventions/${projectId}/validate`, data);
  };

  const getFormatSuggestion = async (projectId: string): Promise<FormatSuggestionResponse> => {
    return api.get<FormatSuggestionResponse>(`/naming-conventions/${projectId}/format-suggestion`);
  };

  // Parse filename thành segments để người dùng assign tag
  const parseFilename = async (
    projectId: string,
    filename: string,
    separator?: string
  ): Promise<ParseFilenameResponse> => {
    return api.post<ParseFilenameResponse>(`/naming-conventions/${projectId}/parse-filename`, {
      filename,
      separator
    });
  };

  return {
    getNamingConvention,
    createOrUpdateNamingConvention,
    updateNamingConvention,
    deleteNamingConvention,
    validateFilename,
    getFormatSuggestion,
    parseFilename
  };
};
