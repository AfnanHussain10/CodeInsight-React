// API configuration
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// API endpoints
export const ENDPOINTS = {
  upload: '/upload',
  documentation: '/documentation',
  evaluation: '/evaluation',
  generate: '/generate',
} as const;