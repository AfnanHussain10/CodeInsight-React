import { API_CONFIG, ENDPOINTS } from '../../config/api.config';
import { handleApiResponse, retryRequest, ApiError } from '../../utils/api.utils';

export async function fetchEvaluation(path: string, model: string) {
  return retryRequest(async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${ENDPOINTS.evaluation}?path=${encodeURIComponent(path)}&model=${encodeURIComponent(model)}`
      );

      await handleApiResponse(response);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to fetch evaluation. Please try again.',
        undefined,
        error
      );
    }
  });
}