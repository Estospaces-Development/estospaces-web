/**
 * Property Service
 * Fetches property data from core-service backend
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export interface Property {
    id: string;
    manager_id?: string;
    title: string;
    description?: string;
    property_type: string; // house, apartment, etc.
    listing_type: 'rent' | 'sale' | 'lease' | 'short_term';
    status: string;
    price: number;
    currency: string;
    deposit_amount?: number;
    bedrooms: number;
    bathrooms: number;
    property_size_sqft?: number;
    year_built?: number;
    furnished?: boolean;
    parking_spaces?: number;
    featured?: boolean;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    postcode: string;
    country: string;
    latitude?: string;
    longitude?: string;
    image_urls?: string[];
    video_urls?: string[];
    virtual_tour_url?: string;
    features?: string[] | string;
    amenities?: string[] | string;
    views?: number;
    inquiries?: number;
    favorites?: number;
    is_verified?: boolean;
    agent_name?: string;
    agent_email?: string;
    agent_phone?: string;
    agent_company?: string;
    created_at?: string;
    updated_at?: string;
}


export interface PropertyFilters {
    country?: string;
    city?: string;
    type?: string;
    status?: string;
    search?: string;
    manager_id?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    limit?: number;
    min_price?: number;
    max_price?: number;
    min_bedrooms?: number;
    max_bedrooms?: number;
    featured?: boolean;
    is_verified?: boolean;
}

/**
 * Fetch properties with optional filters
 * GET /api/v1/properties (core-service)
 */
export const getProperties = async (filters: Record<string, any> = {}): Promise<{ data: Property[] | null; error: string | null }> => {
    try {
        const url = new URL(`${CORE_URL()}/api/v1/properties`);
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                url.searchParams.append(key, String(filters[key]));
            }
        });

        const data = await apiFetch<any>(url.toString());
        // Backend returns { success: true, data: { data: [...], pagination: {...} } }
        // apiFetch returns the 'data' part: { data: [...], pagination: {...} }
        const propertiesData = data.data || data.properties || data;
        const properties = Array.isArray(propertiesData) ? propertiesData : (Array.isArray(data) ? data : []);
        return { data: properties as Property[], error: null };
    } catch (error: any) {
        console.error('[propertyService] getProperties error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Fetch a single property by ID
 * GET /api/v1/properties/:id (core-service)
 */
export const getPropertyById = async (id: string): Promise<{ data: Property | null; error: string | null }> => {
    try {
        const data = await apiFetch<Property>(
            `${CORE_URL()}/api/v1/properties/${id}`,
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[propertyService] getPropertyById error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Create a new property
 * POST /api/v1/properties (core-service, manager/admin)
 */
export const createProperty = async (propertyData: Partial<Property>): Promise<{ data: Property | null; error: string | null }> => {
    try {
        const data = await apiFetch<Property>(
            `${CORE_URL()}/api/v1/properties`,
            {
                method: 'POST',
                body: JSON.stringify(propertyData),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[propertyService] createProperty error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Update a property
 * PUT /api/v1/properties/:id (core-service, owner/admin)
 */
export const updateProperty = async (id: string, propertyData: Partial<Property>): Promise<{ data: Property | null; error: string | null }> => {
    try {
        const data = await apiFetch<Property>(
            `${CORE_URL()}/api/v1/properties/${id}`,
            {
                method: 'PUT',
                body: JSON.stringify(propertyData),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[propertyService] updateProperty error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Delete a property
 * DELETE /api/v1/properties/:id (core-service, owner/admin)
 */
export const deleteProperty = async (id: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch<any>(
            `${CORE_URL()}/api/v1/properties/${id}`,
            { method: 'DELETE' },
        );
        return { error: null };
    } catch (error: any) {
        console.error('[propertyService] deleteProperty error:', error.message);
        return { error: error.message };
    }
};

/**
 * Save a property to favorites
 * POST /api/v1/properties/:id/save (core-service)
 */
export const saveProperty = async (id: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch<any>(
            `${CORE_URL()}/api/v1/properties/${id}/save`,
            { method: 'POST' },
        );
        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

/**
 * Unsave a property from favorites
 * DELETE /api/v1/properties/:id/save (core-service)
 */
export const unsaveProperty = async (id: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch<any>(
            `${CORE_URL()}/api/v1/properties/${id}/save`,
            { method: 'DELETE' },
        );
        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

/**
 * Get user's saved properties
 * GET /api/v1/properties/saved/list (core-service)
 */
export const getSavedProperties = async (): Promise<{ data: Property[] | null; error: string | null }> => {
    try {
        const data = await apiFetch<Property[]>(
            `${CORE_URL()}/api/v1/properties/saved/list`,
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

/**
 * Get property sections for the homepage
 * GET /api/v1/properties/sections (core-service)
 */
export const getPropertySections = async (country: string = 'UK'): Promise<{ data: any; error: string | null }> => {
    try {
        const data = await apiFetch<any>(
            `${CORE_URL()}/api/v1/properties/sections?country=${country}`,
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};
