/**
 * API Utilities
 * Centralized fetch helpers for all backend service calls.
 */

import { emitErrorToast } from '@/lib/apiToastBus';
import { isCurrentAuthRoute } from '@/lib/authUtils';
import {
    AUTH_EXPIRED_MESSAGE,
    handleUnauthorizedSession,
    resetAuthExpiryState,
    syncAuthExpiryState,
} from '@/lib/authExpiry';

const VITE_ENV = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env ?? {};

// ── Service URL Registry ────────────────────────────────────────────────────

const SERVICE_URLS = {
    core: VITE_ENV.VITE_CORE_SERVICE_URL || 'http://localhost:8080',
    booking: VITE_ENV.VITE_BOOKING_SERVICE_URL || 'http://localhost:8081',
    notification: VITE_ENV.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8083',
    payment: VITE_ENV.VITE_PAYMENT_SERVICE_URL || 'http://localhost:8082',
    search: VITE_ENV.VITE_SEARCH_SERVICE_URL || 'http://localhost:8084',
    media: VITE_ENV.VITE_MEDIA_SERVICE_URL || 'http://localhost:8085',
    messaging: VITE_ENV.VITE_MESSAGING_SERVICE_URL || 'http://localhost:8086',
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

/** Returns the base URL for a given backend service. */
export function getServiceUrl(service: ServiceName): string {
    return SERVICE_URLS[service];
}

// ── Auth Header Helper ──────────────────────────────────────────────────────

/** Returns standard auth headers with Bearer token from localStorage. */
export function getAuthHeaders(body?: any, tokenOverride?: string | null): Record<string, string> {
    const token = tokenOverride ?? (typeof window !== 'undefined' ? localStorage.getItem('esto_token') : null);
    const headers: Record<string, string> = {};

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

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

export const AUTH_EXPIRED_EVENT = 'esto-auth-expired';

export class ApiRequestError extends Error {
    status?: number;
    userMessage: string;
    fieldErrors?: Record<string, string>;
    unauthorizedState?: UnauthorizedResponseState;

    constructor(
        message: string,
        userMessage: string,
        status?: number,
        fieldErrors?: Record<string, string>,
        unauthorizedState?: UnauthorizedResponseState,
    ) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.userMessage = userMessage;
        this.fieldErrors = fieldErrors;
        this.unauthorizedState = unauthorizedState;
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

function isAuthEndpoint(url: string) {
    return url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/register');
}

const AUTH_ME_PATH = '/api/v1/auth/me';
const SESSION_VALIDATION_ATTEMPTS = 3;
const SESSION_VALIDATION_RETRY_DELAY_MS = 250;

export type UnauthorizedResponseState = 'session-expired' | 'cleared-on-auth-page' | 'ignored' | 'unhandled';

let sessionValidationPromise: Promise<boolean> | null = null;
let sessionValidationToken: string | null = null;

function getStoredAuthToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('esto_token') : null;
}

async function validateCurrentSession(token: string) {
    if (sessionValidationPromise && sessionValidationToken === token) {
        return sessionValidationPromise;
    }

    sessionValidationToken = token;
    sessionValidationPromise = (async () => {
        for (let attempt = 0; attempt < SESSION_VALIDATION_ATTEMPTS; attempt += 1) {
            const response = await fetch(`${SERVICE_URLS.core}${AUTH_ME_PATH}`, {
                headers: getAuthHeaders(undefined, token),
            });

            if (response.status !== 401) {
                return true;
            }

            if (attempt < SESSION_VALIDATION_ATTEMPTS - 1) {
                // Shared dev can briefly serve a stale instance during rollout.
                await new Promise((resolve) => setTimeout(resolve, SESSION_VALIDATION_RETRY_DELAY_MS * (attempt + 1)));
            }
        }

        return false;
    })()
        .catch(() => true)
        .finally(() => {
            sessionValidationPromise = null;
            sessionValidationToken = null;
        });

    return sessionValidationPromise;
}

export async function handleUnauthorizedResponse(
    url: string,
    requestToken: string | null,
): Promise<UnauthorizedResponseState> {
    const activeToken = getStoredAuthToken();

    if (typeof window === 'undefined' || isAuthEndpoint(url)) {
        return 'unhandled';
    }

    if (!requestToken || requestToken !== activeToken) {
        return 'ignored';
    }

    const sessionStillValid = await validateCurrentSession(activeToken);
    if (sessionStillValid) {
        return 'ignored';
    }

    if (isCurrentAuthRoute()) {
        localStorage.removeItem('esto_token');
        localStorage.removeItem('esto_user');
        resetAuthExpiryState();
        return 'cleared-on-auth-page';
    }

    return handleUnauthorizedSession({
        isBrowser: typeof window !== 'undefined',
        isAuthEndpoint: false,
        token: requestToken,
        onExpire: () => {
            localStorage.removeItem('esto_token');
            localStorage.removeItem('esto_user');
            emitErrorToast(AUTH_EXPIRED_MESSAGE, {
                title: 'Session expired',
                duration: 5000,
                position: 'top-right',
            });
            window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        },
    }) ? 'session-expired' : 'unhandled';
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
    const isDebug = VITE_ENV.DEV === true && VITE_ENV.VITE_DEBUG_API === 'true';
    const method = options.method || 'GET';
    const { suppressErrorToast = false, ...requestOptions } = options;
    const storedToken = getStoredAuthToken();
    const headers = new Headers({
        ...getAuthHeaders(requestOptions.body, storedToken),
        ...requestOptions.headers,
    });
    const authHeader = headers.get('Authorization');
    const requestToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() || null : null;

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
            headers,
        });
    } catch (error: any) {
        if (!suppressErrorToast) {
            notifyApiFailure();
        }
        throw new ApiRequestError(
            error?.message || 'Network request failed',
            SYSTEM_ERROR_MESSAGE,
            undefined,
            undefined,
        );
    }

    if (!response.ok) {
        let errorMsg = `API error: ${response.status}`;
        let fieldErrors: Record<string, string> | undefined;
        try {
            const errorJson = await parseJsonResponse<any>(response);
            errorMsg = errorJson.error || errorJson.message || errorMsg;
            if (errorJson.field_errors && typeof errorJson.field_errors === 'object') {
                fieldErrors = errorJson.field_errors as Record<string, string>;
            }
        } catch {
            // No JSON body
        }
        const unauthorizedState = response.status === 401
            ? await handleUnauthorizedResponse(url, requestToken)
            : 'unhandled';
        if (isDebug) console.error(`[API Response Error] ${method} ${url}:`, errorMsg);
        if (!suppressErrorToast && unauthorizedState === 'unhandled') {
            notifyApiFailure(response.status);
        }
        throw new ApiRequestError(
            errorMsg,
            unauthorizedState === 'session-expired' || unauthorizedState === 'cleared-on-auth-page'
                ? AUTH_EXPIRED_MESSAGE
                : getToastPayload(response.status).message,
            response.status,
            fieldErrors,
            unauthorizedState,
        );
    }

    const json = await parseJsonResponse<T>(response);
    if (typeof window !== 'undefined') {
        syncAuthExpiryState(getStoredAuthToken());
    }

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
            undefined,
            undefined,
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
