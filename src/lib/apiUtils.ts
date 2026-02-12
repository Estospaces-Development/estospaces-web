/**
 * API Utility
 * Handles fetch requests with automatic mock fallbacks and silent error handling for offline environments.
 */

export async function silentFetch<T>(
    url: string,
    options: RequestInit,
    mockData: T,
    serviceName: string
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
        // Check if it's a network error (likely backend down)
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            // Silently return mock data in development
            return { data: mockData, error: null };
        }

        console.error(`[${serviceName}] Unexpected error:`, error);
        return { data: mockData, error: error.message };
    }
}
