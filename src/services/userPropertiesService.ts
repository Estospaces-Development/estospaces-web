/**
 * User Properties Service
 * Fetches user's own properties from core-service backend
 */

import { apiFetchEnvelope, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

interface UserPropertyFilters {
    country?: string;
    city?: string;
    type?: string;
    propertyType?: string | string[];
    listingType?: string | string[];
    listing_type?: string;
    status?: string | string[] | null;
    search?: string;
    page?: number;
    limit?: number;
    min_price?: number;
    priceMin?: number;
    max_price?: number;
    priceMax?: number;
    min_bedrooms?: number;
    bedroomsMin?: number;
    max_bedrooms?: number;
    bedroomsMax?: number;
    featured?: boolean;
    is_verified?: boolean;
    verified?: boolean;
    sortBy?: string;
    sort_by?: string;
    order?: 'asc' | 'desc';
    sort_order?: 'asc' | 'desc';
}

interface PropertyPaginationPayload {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
}

interface PropertyListPayload {
    data?: any[];
    pagination?: PropertyPaginationPayload;
}

const FILTER_PARAM_MAP: Record<string, string> = {
    country: 'country',
    city: 'city',
    type: 'type',
    propertyType: 'type',
    listingType: 'listing_type',
    listing_type: 'listing_type',
    status: 'status',
    search: 'search',
    page: 'page',
    limit: 'limit',
    min_price: 'min_price',
    priceMin: 'min_price',
    max_price: 'max_price',
    priceMax: 'max_price',
    min_bedrooms: 'min_bedrooms',
    bedroomsMin: 'min_bedrooms',
    max_bedrooms: 'max_bedrooms',
    bedroomsMax: 'max_bedrooms',
    featured: 'featured',
    is_verified: 'is_verified',
    verified: 'is_verified',
    sortBy: 'sort_by',
    sort_by: 'sort_by',
    order: 'sort_order',
    sort_order: 'sort_order',
};

const normalizeFilterValue = (value: unknown) => {
    if (Array.isArray(value)) {
        return value.length > 0 ? value[0] : '';
    }

    return value;
};

/**
 * Fetch properties owned/managed by the current user
 * GET /api/v1/properties/mine (core-service)
 */
export const getUserProperties = async (filters: UserPropertyFilters = {}) => {
    try {
        const url = new URL(`${CORE_URL()}/api/v1/properties/mine`);

        Object.entries(filters).forEach(([key, rawValue]) => {
            const param = FILTER_PARAM_MAP[key] || key;
            const value = normalizeFilterValue(rawValue);

            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(param, String(value));
            }
        });

        const page = filters.page ?? 1;
        const limit = filters.limit ?? 10;
        const envelope = await apiFetchEnvelope<PropertyListPayload>(url.toString(), { suppressErrorToast: true });
        const payload = envelope.data;
        const properties = Array.isArray(payload?.data) ? payload.data : [];
        const pagination = payload?.pagination || {};
        const total = pagination.total ?? 0;
        const totalPages = pagination.total_pages ?? Math.max(1, Math.ceil(total / Math.max(pagination.limit ?? limit, 1)));
        const currentPage = pagination.page ?? page;
        const currentLimit = pagination.limit ?? limit;

        return {
            data: properties,
            pagination: {
                page: currentPage,
                limit: currentLimit,
                total,
                totalCount: total,
                totalPages,
                hasNextPage: currentPage < totalPages,
                hasPreviousPage: currentPage > 1,
            },
            error: null,
        };
    } catch (error: any) {
        return {
            data: null,
            pagination: null,
            error: { message: getErrorMessage(error, 'Failed to fetch properties') },
        };
    }
};

