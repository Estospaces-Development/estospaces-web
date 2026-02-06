import { coreApi, setAuthToken, clearAuthToken } from './client';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'manager' | 'admin';
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'user' | 'manager';
}

export interface RegisterResponse {
  user: User;
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

/**
 * Login with email and password
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await coreApi.post<LoginResponse>('/api/v1/auth/login', data);

  // Store token
  if (response.data.token) {
    setAuthToken(response.data.token);
  }

  return response.data;
}

/**
 * Register new user
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await coreApi.post<RegisterResponse>('/api/v1/auth/register', data);

  // Store token
  if (response.data.token) {
    setAuthToken(response.data.token);
  }

  return response.data;
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    await coreApi.post('/api/v1/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearAuthToken();
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  const response = await coreApi.get<User>('/api/v1/auth/me');
  return response.data;
}

/**
 * Request password reset
 */
export async function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  await coreApi.post('/api/v1/auth/forgot-password', data);
}

/**
 * Reset password with token
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  await coreApi.post('/api/v1/auth/reset-password', data);
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<void> {
  await coreApi.post('/api/v1/auth/verify-email', { token });
}

/**
 * Refresh auth token
 */
export async function refreshToken(): Promise<string> {
  const response = await coreApi.post<{ token: string }>('/api/v1/auth/refresh');

  if (response.data.token) {
    setAuthToken(response.data.token);
  }

  return response.data.token;
}
