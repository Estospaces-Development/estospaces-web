import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// API Configuration
const API_CONFIG = {
  coreService: process.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'http://localhost:8080',
  bookingService: process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || 'http://localhost:8081',
  paymentService: process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL || 'http://localhost:8082',
  platformService: process.env.NEXT_PUBLIC_PLATFORM_SERVICE_URL || 'http://localhost:8083',
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
};

/**
 * Create axios instance with default config
 */
function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    (config) => {
      // Get token from cookie or localStorage
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Handle 401 Unauthorized - redirect to login
      if (error.response?.status === 401) {
        clearAuthToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      // Handle 403 Forbidden
      if (error.response?.status === 403) {
        console.error('Access forbidden');
      }

      // Handle 500 Server Error
      if (error.response?.status === 500) {
        console.error('Server error:', error.response.data);
      }

      return Promise.reject(error);
    }
  );

  return client;
}

// Create API clients for each service
export const coreApi = createApiClient(API_CONFIG.coreService);
export const bookingApi = createApiClient(API_CONFIG.bookingService);
export const paymentApi = createApiClient(API_CONFIG.paymentService);
export const platformApi = createApiClient(API_CONFIG.platformService);

/**
 * Get auth token from cookie
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Try to get from cookie
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find((c) => c.trim().startsWith('auth_token='));
  if (tokenCookie) {
    return tokenCookie.split('=')[1];
  }

  // Fallback to localStorage
  return localStorage.getItem('auth_token');
}

/**
 * Set auth token in cookie and localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;

  // Set in cookie (expires in 7 days)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);
  document.cookie = `auth_token=${token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;

  // Also set in localStorage as backup
  localStorage.setItem('auth_token', token);
}

/**
 * Clear auth token from cookie and localStorage
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;

  // Clear cookie
  document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

  // Clear localStorage
  localStorage.removeItem('auth_token');
}

/**
 * Generic API error type
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Extract error message from axios error
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}
