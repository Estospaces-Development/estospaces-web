import { apiFetch, apiFetchEnvelope, getErrorMessage, getServiceUrl } from '../lib/apiUtils';

const API_URL = getServiceUrl('search');
const CORE_API_URL = getServiceUrl('core');

type CoreProperty = {
    id: string;
    title?: string;
    description?: string;
    price?: number;
    property_type?: string;
    listing_type?: string;
    address_line_1?: string;
    city?: string;
    postcode?: string;
    bedrooms?: number;
    bathrooms?: number;
    property_size_sqft?: number;
    image_urls?: string[] | string;
    is_verified?: boolean;
    views?: number;
    created_at?: string;
    latitude?: number | null;
    longitude?: number | null;
};

type CorePropertyListPayload = {
    data?: CoreProperty[];
    pagination?: {
        total?: number;
        page?: number;
        limit?: number;
        total_pages?: number;
    };
};

const toNumber = (value: unknown, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
};

const normalizeListingType = (value?: string) => {
    if (!value || value === 'all') {
        return undefined;
    }

    if (value === 'buy') {
        return 'sale';
    }

    return value;
};

const parseImageList = (images: CoreProperty['image_urls']): string[] => {
    if (Array.isArray(images)) {
        return images.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }

    if (typeof images !== 'string' || images.trim().length === 0) {
        return [];
    }

    try {
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed)) {
            return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        }
    } catch {
        // If it is already a plain URL string, keep it as one image.
    }

    return images.trim().length > 0 ? [images] : [];
};

const mapCorePropertyToSearchResult = (property: CoreProperty): SearchResult => {
    const address = [property.address_line_1, property.city, property.postcode]
        .filter(Boolean)
        .join(', ');

    const images = parseImageList(property.image_urls);

    return {
        id: property.id,
        title: property.title || 'Property',
        description: property.description || '',
        price: toNumber(property.price),
        property_type: property.property_type || '',
        listing_type: property.listing_type || '',
        location: address || property.city || property.postcode || '',
        city: property.city || '',
        postcode: property.postcode || '',
        bedrooms: toNumber(property.bedrooms),
        bathrooms: toNumber(property.bathrooms),
        square_feet: toNumber(property.property_size_sqft),
        images,
        is_verified: !!property.is_verified,
        is_fast_track: false,
        broker_name: '',
        broker_rating: 0,
        response_time_badge: '',
        view_count: toNumber(property.views),
        created_at: property.created_at || '',
        latitude: typeof property.latitude === 'number' ? property.latitude : null,
        longitude: typeof property.longitude === 'number' ? property.longitude : null,
    };
};

const mapSearchFiltersToCoreQuery = (query: string, filters: Record<string, any>) => {
    const params = new URLSearchParams();

    const normalizedQuery = query.trim();
    const normalizedLocation = (filters.location || '').toString().trim();
    const normalizedPostcode = (filters.postcode || '').toString().trim();
    const searchParts = [normalizedQuery];
    if (normalizedPostcode) {
        searchParts.push(normalizedPostcode);
    }
    const combinedSearch = searchParts.join(' ').trim();

    if (combinedSearch && normalizedLocation) {
        params.append('search', `${combinedSearch} ${normalizedLocation}`.trim());
    } else if (combinedSearch) {
        params.append('search', combinedSearch);
    } else if (normalizedLocation) {
        params.append('city', normalizedLocation);
    }

    if (filters.minPrice) params.append('min_price', String(filters.minPrice));
    if (filters.maxPrice) params.append('max_price', String(filters.maxPrice));
    if (filters.propertyType && filters.propertyType !== 'all') params.append('type', String(filters.propertyType));

    const listingType = normalizeListingType(filters.listingType);
    if (listingType) {
        params.append('listing_type', listingType);
    }

    if (filters.minBedrooms) params.append('min_bedrooms', String(filters.minBedrooms));
    if (filters.minBathrooms) params.append('min_bathrooms', String(filters.minBathrooms));
    if (filters.verifiedOnly) params.append('is_verified', 'true');
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    if (filters.sortBy === 'price_asc') {
        params.append('sort_by', 'price');
        params.append('sort_order', 'asc');
    } else if (filters.sortBy === 'price_desc') {
        params.append('sort_by', 'price');
        params.append('sort_order', 'desc');
    } else if (filters.sortBy === 'newest') {
        params.append('sort_by', 'created_at');
        params.append('sort_order', 'desc');
    } else if (filters.sortBy === 'views_desc') {
        params.append('sort_by', 'views');
        params.append('sort_order', 'desc');
    }

    return params;
};

const coreSearchFallback = async (
    query: string,
    filters: Record<string, any>,
): Promise<SearchResponse> => {
    const params = mapSearchFiltersToCoreQuery(query, filters);
    const response = await apiFetchEnvelope<CorePropertyListPayload>(
        `${CORE_API_URL}/api/v1/properties?${params.toString()}`,
        { suppressErrorToast: true },
    );
    const payload = response.data || {};
    let mapped = (payload.data || []).map(mapCorePropertyToSearchResult);

    if (filters.minBathrooms) {
        mapped = mapped.filter(item => (item.bathrooms || 0) >= Number(filters.minBathrooms));
    }

    return {
        success: true,
        data: mapped,
        pagination: {
            total: payload.pagination?.total || mapped.length,
            page: payload.pagination?.page || Number(filters.page || 1),
            limit: payload.pagination?.limit || Number(filters.limit || 10),
        },
    };
};

const buildFallbackFilters = (properties: SearchResult[]): FilterOptions => {
    const propertyTypes = new Set<string>();
    const listingTypes = new Set<string>();
    const locations = new Set<string>();
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const property of properties) {
        if (property.property_type) {
            propertyTypes.add(property.property_type);
        }
        if (property.listing_type) {
            listingTypes.add(property.listing_type);
        }
        if (property.city) {
            locations.add(property.city);
        }

        const price = Number(property.price || 0);
        if (Number.isFinite(price) && price > 0) {
            min = Math.min(min, price);
            max = Math.max(max, price);
        }
    }

    return {
        property_types: Array.from(propertyTypes),
        listing_types: Array.from(listingTypes),
        locations: Array.from(locations),
        price_range: {
            min: Number.isFinite(min) ? min : 0,
            max: Number.isFinite(max) ? max : 0,
        },
    };
};

const looksLikePlaceholderSearchResults = (results: SearchResult[]) => {
    return results.length > 0 && results.every((property) =>
        /^Dummy Property \d+$/i.test(property.title || '') &&
        (!property.listing_type || property.listing_type.trim() === '') &&
        (!property.property_type || property.property_type.trim() === '') &&
        Number(property.price || 0) === 0 &&
        /^Dummy /i.test(property.location || property.city || ''),
    );
};

const looksLikePlaceholderFilters = (filters: FilterOptions | null) => {
    if (!filters) {
        return false;
    }

    return filters.locations.length > 0 && filters.locations.every((location) => /^Dummy City/i.test(location));
};

const looksLikePlaceholderSuggestions = (suggestions: AutocompleteSuggestion[]) => {
    return suggestions.length > 0 && suggestions.every((suggestion) => /^Dummy /i.test(suggestion.text || ''));
};

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

export interface AutocompleteSuggestion {
    id?: string;
    text: string;
    title?: string;
    city?: string;
    type: 'location' | 'city' | 'property' | 'popular';
}

export interface AutocompleteResponse {
    success: boolean;
    data: {
        suggestions: AutocompleteSuggestion[];
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

export interface SavedSearch {
    id: string;
    name: string;
    query?: string;
    location?: string;
    postcode?: string;
    min_price?: number;
    max_price?: number;
    property_type?: string;
    listing_type?: string;
    bedrooms?: number;
    bathrooms?: number;
    features?: string;
    alert_enabled: boolean;
    created_at: string;
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

            const response = await apiFetchEnvelope<SearchResult[]>(
                `${API_URL}/api/v1/search?${params.toString()}`,
                { suppressErrorToast: true },
            );

            if (looksLikePlaceholderSearchResults(response.data || [])) {
                return await coreSearchFallback(query, filters);
            }

            return {
                success: true,
                data: response.data || [],
                pagination: {
                    total: response.pagination?.total || 0,
                    page: response.pagination?.page || Number(filters.page || 1),
                    limit: response.pagination?.limit || Number(filters.limit || 10),
                },
            };
        } catch {
            try {
                return await coreSearchFallback(query, filters);
            } catch {
                return {
                    success: false,
                    data: [],
                    pagination: {
                        total: 0,
                        page: Number(filters.page || 1),
                        limit: Number(filters.limit || 10),
                    },
                };
            }
        }
    },

    /**
     * Get autocomplete suggestions
     */
    autocomplete: async (query: string): Promise<AutocompleteSuggestion[]> => {
        if (!query || query.length < 2) return [];
        try {
            const data = await apiFetch<{ suggestions: AutocompleteSuggestion[] }>(
                `${API_URL}/api/v1/search/autocomplete?q=${encodeURIComponent(query)}`,
                { suppressErrorToast: true },
            );
            const suggestions = data?.suggestions || [];
            if (looksLikePlaceholderSuggestions(suggestions)) {
                throw new Error('placeholder search suggestions');
            }
            return suggestions;
        } catch {
            try {
                const fallback = await coreSearchFallback(query, { page: 1, limit: 10 });
                const suggestions: AutocompleteSuggestion[] = [];
                const seen = new Set<string>();

                for (const property of fallback.data) {
                    if (property.title) {
                        const key = `property:${property.title.toLowerCase()}`;
                        if (!seen.has(key)) {
                            suggestions.push({
                                id: property.id,
                                text: property.title,
                                title: property.title,
                                city: property.city,
                                type: 'property',
                            });
                            seen.add(key);
                        }
                    }

                    if (property.city) {
                        const key = `city:${property.city.toLowerCase()}`;
                        if (!seen.has(key)) {
                            suggestions.push({
                                text: property.city,
                                city: property.city,
                                type: 'city',
                            });
                            seen.add(key);
                        }
                    }

                    if (suggestions.length >= 10) {
                        break;
                    }
                }

                return suggestions;
            } catch {
                return [];
            }
        }
    },

    /**
     * Get popular searches
     */
    getPopularSearches: async (limit: number = 10): Promise<PopularSearch[]> => {
        try {
            const data = await apiFetch<PopularSearch[]>(
                `${API_URL}/api/v1/search/popular?limit=${limit}`,
                { suppressErrorToast: true },
            );
            return data || [];
        } catch {
            return [];
        }
    },

    /**
     * Get available search dynamic filters
     */
    getFilters: async (): Promise<FilterOptions | null> => {
        try {
            const data = await apiFetch<FilterOptions>(
                `${API_URL}/api/v1/search/filters`,
                { suppressErrorToast: true },
            );
            if (looksLikePlaceholderFilters(data || null)) {
                throw new Error('placeholder search filters');
            }
            return data || null;
        } catch {
            try {
                const fallback = await coreSearchFallback('', { page: 1, limit: 100 });
                return buildFallbackFilters(fallback.data);
            } catch {
                return null;
            }
        }
    },

    /**
     * Save a search for the user
     */
    saveSearch: async (data: Partial<SavedSearch>): Promise<{ success: boolean; data?: SavedSearch; error?: string }> => {
        try {
            const response = await apiFetchEnvelope<SavedSearch>(`${API_URL}/api/v1/search/saved`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return { success: false, error: getErrorMessage(error) };
        }
    },

    /**
     * Get user's saved searches
     */
    getSavedSearches: async (): Promise<SavedSearch[]> => {
        const data = await apiFetch<SavedSearch[]>(`${API_URL}/api/v1/search/saved`);
        return data || [];
    },

    /**
     * Delete a saved search
     */
    deleteSavedSearch: async (id: string): Promise<boolean> => {
        await apiFetch(`${API_URL}/api/v1/search/saved/${id}`, {
            method: 'DELETE'
        });
        return true;
    },

    /**
     * Toggle alert for a saved search
     */
    toggleAlert: async (id: string, enabled: boolean): Promise<boolean> => {
        await apiFetch(`${API_URL}/api/v1/search/saved/${id}/alert`, {
            method: 'PUT',
            body: JSON.stringify({ enabled })
        });
        return true;
    }
};
