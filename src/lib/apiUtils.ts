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
import { clearAuthToken, getAuthToken } from '@/lib/authToken';

const VITE_ENV = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env ?? {};

// ── Service URL Registry ────────────────────────────────────────────────────

const LOCAL_SERVICE_URLS = {
    core: 'http://localhost:8080',
    booking: 'http://localhost:8081',
    notification: 'http://localhost:8083',
    payment: 'http://localhost:8082',
    search: 'http://localhost:8084',
    media: 'http://localhost:8085',
    messaging: 'http://localhost:8086',
} as const;

export type ServiceName = keyof typeof LOCAL_SERVICE_URLS;

const SERVICE_ENV_KEYS: Record<ServiceName, readonly string[]> = {
    core: ['VITE_CORE_SERVICE_URL', 'VITE_CORE_API'],
    booking: ['VITE_BOOKING_SERVICE_URL', 'VITE_BOOKING_API'],
    notification: ['VITE_NOTIFICATION_SERVICE_URL', 'VITE_NOTIFICATION_API'],
    payment: ['VITE_PAYMENT_SERVICE_URL', 'VITE_PAYMENT_API'],
    search: ['VITE_SEARCH_SERVICE_URL', 'VITE_SEARCH_API'],
    media: ['VITE_MEDIA_SERVICE_URL', 'VITE_MEDIA_API'],
    messaging: ['VITE_MESSAGING_SERVICE_URL', 'VITE_MESSAGING_API'],
};

const LOCAL_DEV_PROXY_PREFIXES: Record<ServiceName, string> = {
    core: '/__dev_proxy/core',
    booking: '/__dev_proxy/booking',
    notification: '/__dev_proxy/notification',
    payment: '/__dev_proxy/payment',
    search: '/__dev_proxy/search',
    media: '/__dev_proxy/media',
    messaging: '/__dev_proxy/messaging',
};

const LOCAL_DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function isAbsoluteServiceUrl(value: string) {
    return /^https?:\/\//i.test(value);
}

function readEnvString(value: string | boolean | undefined) {
    return typeof value === 'string' ? value.trim() : '';
}

function isProductionBuild() {
    return VITE_ENV.PROD === true || readEnvString(VITE_ENV.MODE) === 'production';
}

function getConfiguredServiceUrl(service: ServiceName) {
    const envKeys = SERVICE_ENV_KEYS[service];
    for (const envKey of envKeys) {
        const configuredUrl = readEnvString(VITE_ENV[envKey]);
        if (configuredUrl) {
            return configuredUrl;
        }
    }
    if (isProductionBuild()) {
        throw new Error(`${envKeys.join(' or ')} must be configured for production builds.`);
    }
    return LOCAL_SERVICE_URLS[service];
}

function resolveServiceUrl(service: ServiceName, configuredUrl: string) {
    if (typeof window === 'undefined' || VITE_ENV.DEV !== true) {
        return configuredUrl;
    }

    const hostname = String(window.location?.hostname || '').toLowerCase();
    const origin = String(window.location?.origin || '').trim();
    if (!LOCAL_DEV_HOSTNAMES.has(hostname) || !origin || !isAbsoluteServiceUrl(configuredUrl)) {
        return configuredUrl;
    }

    try {
        if (new URL(configuredUrl).origin === origin) {
            return configuredUrl;
        }
    } catch {
        return configuredUrl;
    }

    return LOCAL_DEV_PROXY_PREFIXES[service];
}

/** Returns the base URL for a given backend service. */
export function getServiceUrl(service: ServiceName): string {
    return resolveServiceUrl(service, getConfiguredServiceUrl(service));
}

export function buildApiUrl(baseUrl: string, path: string) {
    const nextPath = path.startsWith('/') ? path : `/${path}`;
    const nextUrl = `${baseUrl}${nextPath}`;

    if (isAbsoluteServiceUrl(baseUrl)) {
        return new URL(nextUrl);
    }

    const origin = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';

    return new URL(nextUrl, origin);
}

// ── Auth Header Helper ──────────────────────────────────────────────────────

/** Returns standard auth headers with the active in-memory bearer token. */
export function getAuthHeaders(body?: any, tokenOverride?: string | null): Record<string, string> {
    const token = tokenOverride ?? getAuthToken();
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
    timeoutMs?: number;
    auth?: boolean;
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
    field_errors?: Record<string, string>;
}

export const AUTH_EXPIRED_EVENT = 'esto-auth-expired';

export interface ManagerWorkflowErrorPresentation {
    scope: 'application' | 'property_readiness' | 'purchase' | 'viewing' | 'workflow';
    title: string;
    message: string;
}

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
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const READ_NETWORK_RETRY_ATTEMPTS = 2;
const READ_NETWORK_RETRY_DELAY_MS = 300;

function isReadMethod(method: string) {
    return method.toUpperCase() === 'GET';
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldEmitApiFailureToast(status: number | undefined, method: string) {
    if (isReadMethod(method)) {
        return false;
    }
    if (!status) {
        return true;
    }
    return true;
}

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
    return getAuthToken();
}

function isSessionValidationEndpoint(url: string) {
    return url.includes(AUTH_ME_PATH);
}

async function validateCurrentSession(token: string) {
    if (sessionValidationPromise && sessionValidationToken === token) {
        return sessionValidationPromise;
    }

    sessionValidationToken = token;
    sessionValidationPromise = (async () => {
        for (let attempt = 0; attempt < SESSION_VALIDATION_ATTEMPTS; attempt += 1) {
            const response = await fetch(`${getServiceUrl('core')}${AUTH_ME_PATH}`, {
                credentials: 'omit',
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

    const sessionStillValid = isSessionValidationEndpoint(url)
        ? false
        : await validateCurrentSession(activeToken);
    if (sessionStillValid) {
        return 'ignored';
    }

    if (isCurrentAuthRoute()) {
        clearAuthToken();
        localStorage.removeItem('esto_user');
        resetAuthExpiryState();
        return 'cleared-on-auth-page';
    }

    return handleUnauthorizedSession({
        isBrowser: typeof window !== 'undefined',
        isAuthEndpoint: false,
        token: requestToken,
        onExpire: () => {
            clearAuthToken();
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
        return error.message || error.userMessage || fallback;
    }

    if (error instanceof Error) {
        return error.message || fallback;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
    return error instanceof ApiRequestError ? error.status : undefined;
}

export function resolveManagerWorkflowErrorPresentation(error: unknown): ManagerWorkflowErrorPresentation | null {
    const apiError = error instanceof ApiRequestError ? error : null;
    const message = (apiError?.userMessage || getErrorMessage(error, '')).trim();
    const status = getErrorStatus(error);
    if (!message) {
        return null;
    }

    const normalizedMessage = message.toLowerCase();
    const looksOperational = normalizedMessage.includes('temporarily unavailable')
        || normalizedMessage.includes('workflow unavailable')
        || normalizedMessage.includes('retry the manager action')
        || normalizedMessage.includes('service unavailable')
        || normalizedMessage.includes('compliance service is reachable');

    if (!looksOperational && status !== 503) {
        return null;
    }

    if (
        normalizedMessage.includes('property readiness')
        || normalizedMessage.includes('property compliance readiness')
        || normalizedMessage.includes('compliance service')
    ) {
        return {
            scope: 'property_readiness',
            title: 'Property readiness temporarily unavailable',
            message,
        };
    }

    if (normalizedMessage.includes('viewing workflow unavailable') || normalizedMessage.includes('viewing action')) {
        return {
            scope: 'viewing',
            title: 'Viewing action temporarily unavailable',
            message,
        };
    }

    if (normalizedMessage.includes('live purchase workflow unavailable') || normalizedMessage.includes('purchase workflow')) {
        return {
            scope: 'purchase',
            title: 'Live purchase workflow unavailable',
            message,
        };
    }

    if (normalizedMessage.includes('live application workflow unavailable') || normalizedMessage.includes('application workflow')) {
        return {
            scope: 'application',
            title: 'Live application workflow unavailable',
            message,
        };
    }

    return {
        scope: 'workflow',
        title: 'Live workflow temporarily unavailable',
        message,
    };
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
    const { suppressErrorToast = false, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, auth = true, ...requestOptions } = options;
    const storedToken = auth ? getStoredAuthToken() : null;
    const headers = new Headers({
        ...getAuthHeaders(requestOptions.body, storedToken),
        ...requestOptions.headers,
    });
    const authHeader = headers.get('Authorization');
    const requestToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() || null : null;

    const callerSignal = requestOptions.signal;
    let response: Response | null = null;
    try {
        const maxAttempts = isReadMethod(method) ? READ_NETWORK_RETRY_ATTEMPTS + 1 : 1;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const timeoutController = new AbortController();
            const timeoutId = timeoutMs > 0
                ? globalThis.setTimeout(() => timeoutController.abort(), timeoutMs)
                : null;
            const handleCallerAbort = () => timeoutController.abort();
            if (callerSignal) {
                if (callerSignal.aborted) {
                    timeoutController.abort();
                }
                callerSignal.addEventListener('abort', handleCallerAbort, { once: true });
            }

            try {
                const fetchOptions: RequestInit = {
                    ...requestOptions,
                    headers,
                    signal: timeoutController.signal,
                };
                if (fetchOptions.credentials === undefined) {
                    fetchOptions.credentials = 'omit';
                }

                response = await fetch(url, {
                    ...fetchOptions,
                });
                break;
            } catch (error: any) {
                if (error?.name === 'AbortError' || attempt >= maxAttempts - 1) {
                    throw error;
                }
                await sleep(READ_NETWORK_RETRY_DELAY_MS * (attempt + 1));
            } finally {
                if (timeoutId !== null) {
                    globalThis.clearTimeout(timeoutId);
                }
                if (callerSignal) {
                    callerSignal.removeEventListener('abort', handleCallerAbort);
                }
            }
        }
    } catch (error: any) {
        if (!suppressErrorToast && shouldEmitApiFailureToast(undefined, method)) {
            notifyApiFailure();
        }
        throw new ApiRequestError(
            error?.name === 'AbortError' ? 'Request timed out' : error?.message || 'Network request failed',
            SYSTEM_ERROR_MESSAGE,
            undefined,
            undefined,
        );
    }

    if (!response) {
        throw new ApiRequestError(
            'Network request failed',
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
        if (isDebug) console.error('[API Response Error] %s %s: %s', method, url, errorMsg);
        if (!suppressErrorToast && unauthorizedState === 'unhandled' && shouldEmitApiFailureToast(response.status, method)) {
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

    if (json.success === false) {
        if (!suppressErrorToast && shouldEmitApiFailureToast(undefined, method)) {
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
