import { API_CONFIG } from '../config/api.config';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleApiResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(
      errorData?.message || `HTTP error ${response.status}`,
      response.status,
      errorData
    );
  }
  return response;
}

export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  retryCount = API_CONFIG.retryAttempts
): Promise<T> {
  try {
    return await requestFn();
  } catch (error) {
    if (retryCount > 0 && error instanceof ApiError && error.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
      return retryRequest(requestFn, retryCount - 1);
    }
    throw error;
  }
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof Error && 
    (error.message.includes('Failed to fetch') || 
     error.message.includes('Network request failed'));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (isNetworkError(error)) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}