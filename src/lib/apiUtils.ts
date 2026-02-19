/**
 * API Utilities
 * Centralized fetch helpers for all backend service calls.
 */

// ── Service URL Registry ────────────────────────────────────────────────────

const SERVICE_URLS = {
    core: () => import.meta.env.VITE_CORE_SERVICE_URL || 'http://localhost:8080',
    booking: () => import.meta.env.VITE_BOOKING_SERVICE_URL || 'http://localhost:8081',
    notification: () => import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8083',
    payment: () => import.meta.env.VITE_PAYMENT_SERVICE_URL || 'http://localhost:8082',
    search: () => import.meta.env.VITE_SEARCH_SERVICE_URL || 'http://localhost:8084',
    messaging: () => import.meta.env.VITE_MESSAGING_SERVICE_URL || 'http://localhost:8085',
    media: () => import.meta.env.VITE_MEDIA_SERVICE_URL || 'http://localhost:8086',
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

/** Returns the base URL for a given backend service. */
export function getServiceUrl(service: ServiceName): string {
    return SERVICE_URLS[service]();
}

// ── Auth Header Helper ──────────────────────────────────────────────────────

/** Returns standard auth headers with Bearer token from localStorage. */
export function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('esto_token') : '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
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
    const response = await fetch(url, {
        ...options,
        headers: { ...getAuthHeaders(), ...options.headers },
    });

    const json = await response.json();

    if (!response.ok || json.success === false) {
        throw new Error(json.error || json.message || `API error: ${response.status}`);
    }

    return (json.data ?? json) as T;
}

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
            console.warn(`[${serviceName}] API call failed with status ${response.status}. Using mock data.`);
            return { data: mockData, error: null };
        }

        const data = await response.json();
        return { data: (data.data || data) as T, error: null };
    } catch (error: any) {
        // Network error (likely backend down) → silently return mock data
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            return { data: mockData, error: null };
        }

        console.error(`[${serviceName}] Unexpected error:`, error);
        return { data: mockData, error: error.message };
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
            // Backend offline → silent mock fallback
            return { data: mockData, error: null };
        }
        console.error(`[${serviceName}]`, error.message);
        return { data: mockData, error: error.message };
    }
}
