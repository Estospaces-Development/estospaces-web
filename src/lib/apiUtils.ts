/**
 * API Utilities
 * Centralized fetch helpers for all backend service calls.
 */

// ── Service URL Registry ────────────────────────────────────────────────────

const FALLBACK_SERVICE_URLS = {
    local: {
        core: 'http://localhost:8080',
        booking: 'http://localhost:8081',
        payment: 'http://localhost:8082',
        notification: 'http://localhost:8083',
        search: 'http://localhost:8084',
        media: 'http://localhost:8085',
        messaging: 'http://localhost:8086',
    },
    dev: {
        core: 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app',
        booking: 'https://estospaces-booking-service-dev-zaryfkxmeq-nw.a.run.app',
        payment: 'https://estospaces-payment-service-dev-zaryfkxmeq-nw.a.run.app',
        notification: 'https://estospaces-notification-service-dev-zaryfkxmeq-nw.a.run.app',
        search: 'https://estospaces-search-service-dev-zaryfkxmeq-nw.a.run.app',
        media: 'https://estospaces-media-service-dev-zaryfkxmeq-nw.a.run.app',
        messaging: 'https://estospaces-messaging-service-dev-zaryfkxmeq-nw.a.run.app',
    },
    prod: {
        core: 'https://estospaces-core-service-prod-zaryfkxmeq-nw.a.run.app',
        booking: 'https://estospaces-booking-service-prod-zaryfkxmeq-nw.a.run.app',
        payment: 'https://estospaces-payment-service-prod-zaryfkxmeq-nw.a.run.app',
        notification: 'https://estospaces-notification-service-prod-zaryfkxmeq-nw.a.run.app',
        search: 'https://estospaces-search-service-prod-zaryfkxmeq-nw.a.run.app',
        media: 'https://estospaces-media-service-prod-zaryfkxmeq-nw.a.run.app',
        messaging: 'https://estospaces-messaging-service-prod-zaryfkxmeq-nw.a.run.app',
    },
} as const;

type RuntimeEnvironment = keyof typeof FALLBACK_SERVICE_URLS;

function resolveRuntimeEnvironment(): RuntimeEnvironment {
    if (typeof window === 'undefined') {
        return import.meta.env.MODE === 'development' ? 'local' : 'prod';
    }

    const hostname = window.location.hostname;
    if (hostname === 'app.estospaces.com' || hostname === 'admin.estospaces.com' || hostname.includes('-prod-')) {
        return 'prod';
    }
    if (hostname.includes('-dev-')) {
        return 'dev';
    }
    return import.meta.env.MODE === 'development' ? 'local' : 'prod';
}

function resolveServiceUrl(service: keyof typeof FALLBACK_SERVICE_URLS.local, envValue: string | undefined): string {
    if (envValue) {
        return envValue;
    }
    return FALLBACK_SERVICE_URLS[resolveRuntimeEnvironment()][service];
}

const SERVICE_URLS = {
    core: () => resolveServiceUrl('core', import.meta.env.VITE_CORE_SERVICE_URL),
    booking: () => resolveServiceUrl('booking', import.meta.env.VITE_BOOKING_SERVICE_URL),
    notification: () => resolveServiceUrl('notification', import.meta.env.VITE_NOTIFICATION_SERVICE_URL),
    payment: () => resolveServiceUrl('payment', import.meta.env.VITE_PAYMENT_SERVICE_URL),
    search: () => resolveServiceUrl('search', import.meta.env.VITE_SEARCH_SERVICE_URL),
    messaging: () => resolveServiceUrl('messaging', import.meta.env.VITE_MESSAGING_SERVICE_URL),
    media: () => resolveServiceUrl('media', import.meta.env.VITE_MEDIA_SERVICE_URL),
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

/** Returns the base URL for a given backend service. */
export function getServiceUrl(service: ServiceName): string {
    return SERVICE_URLS[service]();
}

// ── Auth Header Helper ──────────────────────────────────────────────────────

/** Returns standard auth headers with Bearer token from localStorage. */
export function getAuthHeaders(body?: any): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('esto_token') : '';
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
    };

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

/**
 * Authenticated fetch that expects `{ success, data }` envelope from backend.
 * Throws on network errors or non-OK status codes.
 */
export function getErrorMessage(error: unknown, fallback = 'Request failed'): string {
    if (error instanceof Error) {
        return error.message || fallback;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return fallback;
}

export async function apiFetch<T>(
    url: string,
    options: ApiFetchOptions = {},
): Promise<T> {
    const { suppressErrorToast: _suppressErrorToast, ...requestOptions } = options;
    const response = await fetch(url, {
        ...requestOptions,
        headers: { ...getAuthHeaders(requestOptions.body), ...requestOptions.headers },
    });

    const json = await response.json();

    if (!response.ok || json.success === false) {
        throw new Error(json.error || json.message || `API error: ${response.status}`);
    }

    return (json.data ?? json) as T;
}

// ── Environment Check ───────────────────────────────────────────────────────

const isDev = import.meta.env.MODE === 'development';

// ── silentFetch — graceful mock fallback (backward compat) ──────────────────

/**
 * Fetch with automatic mock fallback when backend is unreachable.
 * Used by property and leads services that need to work offline.
 */
export async function silentFetch<T>(
    url: string,
    options: RequestInit,
    mockData: T,
    serviceName: string,
): Promise<{ data: T; error: string | null }> {
    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            console.warn(`[${serviceName}] API call failed with status ${response.status}.`);
            if (isDev) {
                console.info(`[${serviceName}] Using mock data (Dev Mode).`);
                return { data: mockData, error: null };
            }
            return { data: null as unknown as T, error: `API error: ${response.status}` };
        }

        const data = await response.json();
        return { data: (data.data || data) as T, error: null };
    } catch (error: any) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            if (isDev) {
                return { data: mockData, error: null };
            }
            return { data: null as unknown as T, error: 'Network error: Backend is unreachable' };
        }

        console.error(`[${serviceName}] Unexpected error:`, error);
        return { data: null as unknown as T, error: error.message };
    }
}

// ── safeFetch — try real API, fallback to mock ──────────────────────────────

/**
 * Try to call the real API; if the backend is down, return the provided mock data.
 * Unlike silentFetch, this uses the standard `apiFetch` internally and only falls
 * back on network errors (not on 4xx/5xx).
 */
export async function safeFetch<T>(
    url: string,
    options: RequestInit = {},
    mockData: T,
    serviceName: string,
): Promise<{ data: T; error: string | null }> {
    try {
        const data = await apiFetch<T>(url, options);
        return { data, error: null };
    } catch (error: any) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            // Backend offline
            if (isDev) {
                return { data: mockData, error: null };
            }
            return { data: null as unknown as T, error: 'Network error: Backend is unreachable' };
        }
        console.error(`[${serviceName}]`, error.message);
        return { data: null as unknown as T, error: error.message };
    }
}
