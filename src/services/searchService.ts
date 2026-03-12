import { apiFetch, getAuthHeaders, getServiceUrl } from '../lib/apiUtils';

const API_URL = getServiceUrl('search');

export interface SearchFilters {
    keyword?: string;
    location?: string;
    listingType?: 'all' | 'rent' | 'sale';
    propertyType?: string;
    minPrice?: number | null;
    maxPrice?: number | null;
    minBedrooms?: number | null;
    maxBedrooms?: number | null;
    minBathrooms?: number | null;
}

export interface PaginationState {
    page: number;
    limit: number;
    total?: number;
}

export interface SearchResult {
    id: string;
    title: string;
    description: string;
    price: number;
    property_type: string;
    listing_type: string;
    location: string;
    city: string;
    postcode: string;
    bedrooms: number;
    bathrooms: number;
    square_feet: number;
    images: string | string[];
    is_verified: boolean;
    is_fast_track: boolean;
    broker_name: string;
    broker_rating: number;
    response_time_badge: string;
    view_count: number;
    created_at: string;
    latitude?: number | null;
    longitude?: number | null;
}

export interface SearchResponse {
    success: boolean;
    data: SearchResult[];
    pagination: {
        total: number;
        page: number;
        limit: number;
    };
}

export interface AutocompleteResponse {
    success: boolean;
    data: {
        suggestions: string[];
    };
}

export interface PopularSearch {
    id: string;
    term: string;
    count: number;
    location: string;
}

export interface PopularSearchResponse {
    success: boolean;
    data: PopularSearch[];
}

export interface FilterOptions {
    property_types: string[];
    listing_types: string[];
    locations: string[];
    price_range: {
        min: number;
        max: number;
    };
}

export interface FilterOptionsResponse {
    success: boolean;
    data: FilterOptions;
}

export const searchService = {
    /**
     * Main search endpoint for properties
     */
    search: async (
        query: string,
        filters: Record<string, any> = {}
    ): Promise<SearchResponse> => {
        try {
            const params = new URLSearchParams();
            if (query) params.append('q', query);

            if (filters.location) params.append('location', filters.location);
            if (filters.postcode) params.append('postcode', filters.postcode);
            if (filters.minPrice) params.append('min_price', filters.minPrice.toString());
            if (filters.maxPrice) params.append('max_price', filters.maxPrice.toString());
            if (filters.propertyType) params.append('property_type', filters.propertyType);
            if (filters.listingType && filters.listingType !== 'all') params.append('listing_type', filters.listingType);
            if (filters.minBedrooms) params.append('bedrooms', filters.minBedrooms.toString());
            if (filters.minBathrooms) params.append('bathrooms', filters.minBathrooms.toString());
            if (filters.verifiedOnly) params.append('verified_only', 'true');
            if (filters.fastTrack) params.append('fast_track', 'true');

            if (filters.sortBy) params.append('sort_by', filters.sortBy);
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.limit) params.append('limit', filters.limit.toString());

            // The API returns pagination info in the outer envelope, but apiFetch extracts data.
            // Using fetch + getAuthHeaders to preserve pagination since the helper unwraps data.
            const res = await fetch(`${API_URL}/api/v1/search?${params.toString()}`, {
                headers: getAuthHeaders()
            });
            const json = await res.json();

            if (res.ok && json.success) {
                return {
                    success: true,
                    data: json.data,
                    pagination: json.pagination
                };
            }
            return { success: false, data: [], pagination: { total: 0, page: 1, limit: 10 } };
        } catch (error) {
            return { success: false, data: [], pagination: { total: 0, page: 1, limit: 10 } };
        }
    },

    /**
     * Get autocomplete suggestions
     */
    autocomplete: async (query: string): Promise<string[]> => {
        if (!query || query.length < 2) return [];
        try {
            const data = await apiFetch<{ suggestions: string[] }>(`${API_URL}/api/v1/search/autocomplete?q=${encodeURIComponent(query)}`);
            return data?.suggestions || [];
        } catch (error) {
            return [];
        }
    },

    /**
     * Get popular searches
     */
    getPopularSearches: async (limit: number = 10): Promise<PopularSearch[]> => {
        try {
            const data = await apiFetch<PopularSearch[]>(`${API_URL}/api/v1/search/popular?limit=${limit}`);
            return data || [];
        } catch (error) {
            return [];
        }
    },

    /**
     * Get available search dynamic filters
     */
    getFilters: async (): Promise<FilterOptions | null> => {
        try {
            const data = await apiFetch<FilterOptions>(`${API_URL}/api/v1/search/filters`);
            return data || null;
        } catch (error) {
            return null;
        }
    }
};
