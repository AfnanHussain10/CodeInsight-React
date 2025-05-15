import { API_CONFIG, ENDPOINTS } from '../../config/api.config';
import { handleApiResponse, retryRequest, ApiError } from '../../utils/api.utils';

export async function fetchDocumentation(path: string) {
  return retryRequest(async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${ENDPOINTS.documentation}?path=${encodeURIComponent(path)}`
      );

      await handleApiResponse(response);
      return response.text();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to fetch documentation. Please try again.',
        undefined,
        error
      );
    }
  });
}

export async function generateDocumentation(
  rootPath: string,
  projectName: string,
  selectedItems: string[],
  fileModel: string,
  folderModel: string,
  projectModel: string
) {
  return retryRequest(async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${ENDPOINTS.generate}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          root_path: rootPath,
          project_name: projectName,
          selected_items: selectedItems,
          file_model: fileModel,
          folder_model: folderModel,
          project_model: projectModel,
        }),
      });

      await handleApiResponse(response);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to generate documentation. Please try again.',
        undefined,
        error
      );
    }
  });
}