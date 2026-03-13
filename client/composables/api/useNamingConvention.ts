import type {
  NamingConvention,
  CreateNamingConventionRequest,
  UpdateNamingConventionRequest,
  ValidateFilenameRequest,
  ValidateFilenameResponse,
  FormatSuggestionResponse
} from "~/types/naming-convention";

/**
 * Composable để làm việc với Naming Convention API
 */
export const useNamingConvention = () => {
  const api = useApi();

  /**
   * Lấy naming convention config của project
   */
  const getNamingConvention = async (projectId: string): Promise<NamingConvention> => {
    const response = await api.get<NamingConvention>(`/naming-conventions/${projectId}`);
    return response.data;
  };

  /**
   * Tạo hoặc cập nhật naming convention config
   */
  const createOrUpdateNamingConvention = async (
    data: CreateNamingConventionRequest
  ): Promise<NamingConvention> => {
    const response = await api.post<NamingConvention>("/naming-conventions", data);
    return response.data;
  };

  /**
   * Cập nhật naming convention config
   */
  const updateNamingConvention = async (
    projectId: string,
    data: UpdateNamingConventionRequest
  ): Promise<NamingConvention> => {
    const response = await api.put<NamingConvention>(`/naming-conventions/${projectId}`, data);
    return response.data;
  };

  /**
   * Xóa naming convention config (reset về default)
   */
  const deleteNamingConvention = async (projectId: string): Promise<void> => {
    await api.delete(`/naming-conventions/${projectId}`);
  };

  /**
   * Validate filename theo naming convention
   */
  const validateFilename = async (
    projectId: string,
    data: ValidateFilenameRequest
  ): Promise<ValidateFilenameResponse> => {
    const response = await api.post<ValidateFilenameResponse>(
      `/naming-conventions/${projectId}/validate`,
      data
    );
    return response.data;
  };

  /**
   * Lấy format suggestion từ naming convention
   */
  const getFormatSuggestion = async (projectId: string): Promise<FormatSuggestionResponse> => {
    const response = await api.get<FormatSuggestionResponse>(
      `/naming-conventions/${projectId}/format-suggestion`
    );
    return response.data;
  };

  return {
    getNamingConvention,
    createOrUpdateNamingConvention,
    updateNamingConvention,
    deleteNamingConvention,
    validateFilename,
    getFormatSuggestion
  };
};
