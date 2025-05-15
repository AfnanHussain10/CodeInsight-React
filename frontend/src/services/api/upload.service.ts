import { API_CONFIG, ENDPOINTS } from '../../config/api.config';
import { handleApiResponse, retryRequest, ApiError } from '../../utils/api.utils';

export async function uploadProject(files: FileList, projectName: string) {
  const formData = new FormData();
  
  // Add each file with its relative path
  Array.from(files).forEach(file => {
    const relativePath = file.webkitRelativePath;
    formData.append('files', file, relativePath);
  });
  
  formData.append('project_name', projectName);

  return retryRequest(async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${ENDPOINTS.upload}`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header - browser will set it with boundary for FormData
          'Accept': 'application/json',
        },
      });

      await handleApiResponse(response);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Improve error messages based on error type
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new ApiError(
          'Unable to connect to the server. Please check your internet connection.',
          undefined,
          error
        );
      }
      
      throw new ApiError(
        'Failed to upload project. Please try again.',
        undefined,
        error
      );
    }
  }, API_CONFIG.retryAttempts);
}