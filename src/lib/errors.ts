import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// ─── API Error Types ────────────────────────────────────────────────────────

export interface ApiError {
    message: string;
    code: string;
    status: number;
    details?: Record<string, string[]>;
}

export class AppError extends Error {
    public code: string;
    public status: number;
    public details?: Record<string, string[]>;

    constructor(error: ApiError) {
        super(error.message);
        this.name = 'AppError';
        this.code = error.code;
        this.status = error.status;
        this.details = error.details;
    }
}

// ─── Error Parser ───────────────────────────────────────────────────────────

export function parseApiError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string; error?: string; code?: string }>;
        const status = axiosError.response?.status || 500;
        const data = axiosError.response?.data;

        const messages: Record<number, string> = {
            400: 'Invalid request. Please check your input.',
            401: 'Your session has expired. Please log in again.',
            403: 'You do not have permission to perform this action.',
            404: 'The requested resource was not found.',
            409: 'This resource already exists or conflicts with another.',
            422: 'Validation failed. Please check your input.',
            429: 'Too many requests. Please try again later.',
            500: 'Something went wrong on our end. Please try again.',
            503: 'Service is temporarily unavailable. Please try again later.',
        };

        return new AppError({
            message: data?.message || data?.error || messages[status] || 'An unexpected error occurred.',
            code: data?.code || `HTTP_${status}`,
            status,
        });
    }

    if (error instanceof Error) {
        return new AppError({
            message: error.message,
            code: 'UNKNOWN_ERROR',
            status: 0,
        });
    }

    return new AppError({
        message: 'An unexpected error occurred.',
        code: 'UNKNOWN_ERROR',
        status: 0,
    });
}

// ─── Safe API Call Wrapper ──────────────────────────────────────────────────

type ApiResult<T> = { data: T; error: null } | { data: null; error: AppError };

/**
 * Wraps an async API call with consistent error handling.
 *
 * Usage:
 *   const { data, error } = await safeApiCall(() => api.get('/users'));
 *   if (error) { toast.error(error.message); return; }
 *   setUsers(data);
 */
export async function safeApiCall<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
    try {
        const data = await fn();
        return { data, error: null };
    } catch (err) {
        return { data: null, error: parseApiError(err) };
    }
}

// ─── Retry Wrapper ──────────────────────────────────────────────────────────

export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (axios.isAxiosError(err) && err.response && err.response.status < 500) {
                throw err; // Don't retry client errors
            }
            if (i < maxRetries - 1) {
                await new Promise((res) => setTimeout(res, delayMs * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
}
