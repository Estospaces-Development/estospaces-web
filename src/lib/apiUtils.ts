/**
 * API Utilities
 * Centralized fetch helpers for all backend service calls.
 */

// ── Service URL Registry ────────────────────────────────────────────────────

const SERVICE_URLS = {
    core: import.meta.env.VITE_CORE_SERVICE_URL || 'http://localhost:8080',
    booking: import.meta.env.VITE_BOOKING_SERVICE_URL || 'http://localhost:8081',
    notification: import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8083',
    payment: import.meta.env.VITE_PAYMENT_SERVICE_URL || 'http://localhost:8082',
    search: import.meta.env.VITE_SEARCH_SERVICE_URL || 'http://localhost:8084',
    messaging: import.meta.env.VITE_MESSAGING_SERVICE_URL || 'http://localhost:8085',
    media: import.meta.env.VITE_MEDIA_SERVICE_URL || 'http://localhost:8086',
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

/**
 * Authenticated fetch that expects `{ success, data }` envelope from backend.
 * Throws on network errors or non-OK status codes.
 */
export async function apiFetch<T>(
    url: string,
    options: RequestInit = {},
): Promise<T> {
    const isDebug = import.meta.env.DEV;
    const method = options.method || 'GET';

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

    const response = await fetch(url, {
        ...options,
        headers: { ...getAuthHeaders(options.body), ...options.headers },
    });

    if (!response.ok) {
        let errorMsg = `API error: ${response.status}`;
        try {
            const errorJson = await response.json();
            errorMsg = errorJson.error || errorJson.message || errorMsg;
        } catch {
            // No JSON body
        }
        if (isDebug) console.error(`[API Response Error] ${method} ${url}:`, errorMsg);
        throw new Error(errorMsg);
    }

    const json = await response.json();

    if (isDebug) {
        console.log(`[API Response Success] ${method} ${url}:`, json);
    }

    if (json.success === false) {
        throw new Error(json.error || json.message || 'API operation failed');
    }

    return (json.data ?? json) as T;
}
