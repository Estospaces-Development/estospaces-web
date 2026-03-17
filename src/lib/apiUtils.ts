/**
 * API Utilities
 * Centralized fetch helpers for all backend service calls.
 */

import { emitErrorToast } from '@/lib/apiToastBus';

// ── Service URL Registry ────────────────────────────────────────────────────

const SERVICE_URLS = {
    core: import.meta.env.VITE_CORE_SERVICE_URL || 'http://localhost:8080',
    booking: import.meta.env.VITE_BOOKING_SERVICE_URL || 'http://localhost:8081',
    notification: import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8083',
    payment: import.meta.env.VITE_PAYMENT_SERVICE_URL || 'http://localhost:8082',
    search: import.meta.env.VITE_SEARCH_SERVICE_URL || 'http://localhost:8084',
    media: import.meta.env.VITE_MEDIA_SERVICE_URL || 'http://localhost:8085',
    messaging: import.meta.env.VITE_MESSAGING_SERVICE_URL || 'http://localhost:8086',
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

/** Returns the base URL for a given backend service. */
export function getServiceUrl(service: ServiceName): string {
    return SERVICE_URLS[service];
}

// ── Auth Header Helper ──────────────────────────────────────────────────────

/** Returns standard auth headers with Bearer token from localStorage. */
export function getAuthHeaders(body?: any): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('esto_token') : '';
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
    };

    // Only set JSON content type if not uploading files
    if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

// ── apiFetch — strict fetch that throws on error ────────────────────────────

export interface ApiResponse<T> {
    data: T;
    error: string | null;
}

export interface ApiFetchOptions extends RequestInit {
    suppressErrorToast?: boolean;
}

export interface ApiEnvelope<T> {
    success?: boolean;
    data?: T;
    pagination?: {
        total?: number;
        page?: number;
        limit?: number;
        total_pages?: number;
    };
    error?: string;
    message?: string;
}

export class ApiRequestError extends Error {
    status?: number;
    userMessage: string;

    constructor(message: string, userMessage: string, status?: number) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.userMessage = userMessage;
    }
}

const USER_ERROR_MESSAGE = 'Invalid data provided. Please check your inputs.';
const SYSTEM_ERROR_MESSAGE = 'The service is temporarily unreachable. We are working on a fix.';

function getToastPayload(status?: number) {
    if (status && status >= 400 && status < 500) {
        return {
            message: USER_ERROR_MESSAGE,
            title: 'Please review your input',
        };
    }

    return {
        message: SYSTEM_ERROR_MESSAGE,
        title: 'Temporary service issue',
    };
}

function notifyApiFailure(status?: number) {
    const toast = getToastPayload(status);
    emitErrorToast(toast.message, {
        title: toast.title,
        duration: 5000,
        position: 'top-right',
    });
}

export function getErrorMessage(error: unknown, fallback = SYSTEM_ERROR_MESSAGE): string {
    if (error instanceof ApiRequestError) {
        return error.message || error.userMessage;
    }

    if (error instanceof Error) {
        return error.message || fallback;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return fallback;
}

async function parseJsonResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
    if (response.status === 204) {
        return {} as ApiEnvelope<T>;
    }

    const text = await response.text();
    if (!text) {
        return {} as ApiEnvelope<T>;
    }

    return JSON.parse(text) as ApiEnvelope<T>;
}

/**
 * Authenticated fetch that expects `{ success, data }` envelope from backend.
 * Throws on network errors or non-OK status codes.
 */
export async function apiFetchEnvelope<T>(
    url: string,
    options: ApiFetchOptions = {},
): Promise<ApiEnvelope<T>> {
    const isDebug = import.meta.env.DEV && import.meta.env.VITE_DEBUG_API === 'true';
    const method = options.method || 'GET';
    const { suppressErrorToast = false, ...requestOptions } = options;

    if (isDebug) {
        let bodyLog = '';
        if (options.body) {
            if (options.body instanceof FormData) {
                bodyLog = '[FormData]';
            } else {
                try {
                    bodyLog = JSON.parse(options.body as string);
                } catch {
                    bodyLog = '[Raw Body]';
                }
            }
        }
        console.log(`[API Request] ${method} ${url}`, bodyLog);
    }

    let response: Response;
    try {
        response = await fetch(url, {
            ...requestOptions,
            headers: { ...getAuthHeaders(requestOptions.body), ...requestOptions.headers },
        });
    } catch (error: any) {
        if (!suppressErrorToast) {
            notifyApiFailure();
        }
        throw new ApiRequestError(
            error?.message || 'Network request failed',
            SYSTEM_ERROR_MESSAGE,
        );
    }

    if (!response.ok) {
        let errorMsg = `API error: ${response.status}`;
        try {
            const errorJson = await parseJsonResponse<any>(response);
            errorMsg = errorJson.error || errorJson.message || errorMsg;
        } catch {
            // No JSON body
        }
        if (isDebug) console.error(`[API Response Error] ${method} ${url}:`, errorMsg);
        if (!suppressErrorToast) {
            notifyApiFailure(response.status);
        }
        throw new ApiRequestError(errorMsg, getToastPayload(response.status).message, response.status);
    }

    const json = await parseJsonResponse<T>(response);

    if (isDebug) {
        console.log(`[API Response Success] ${method} ${url}:`, json);
    }

    if (json.success === false) {
        if (!suppressErrorToast) {
            notifyApiFailure();
        }
        throw new ApiRequestError(
            json.error || json.message || 'API operation failed',
            SYSTEM_ERROR_MESSAGE,
        );
    }

    return json;
}

export async function apiFetch<T>(
    url: string,
    options: ApiFetchOptions = {},
): Promise<T> {
    const json = await apiFetchEnvelope<T>(url, options);
    return (json.data ?? json) as T;
}
