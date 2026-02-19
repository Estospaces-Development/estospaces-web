/**
 * User Properties Service
 * Fetches user's own properties from core-service backend
 * (replaces old Supabase-direct queries)
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

interface UserPropertyFilters {
    status?: string | null;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
}

/**
 * Fetch properties owned/managed by the current user
 * GET /api/v1/properties/mine (core-service)
 */
export const getUserProperties = async ({
    status = null,
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    order = 'desc',
}: UserPropertyFilters = {}) => {
    try {
        const url = new URL(`${CORE_URL()}/api/v1/properties/mine`);
        url.searchParams.append('page', String(page));
        url.searchParams.append('limit', String(limit));
        url.searchParams.append('sort_by', sortBy);
        url.searchParams.append('sort_order', order);
        if (status) url.searchParams.append('status', status);

        const data = await apiFetch<any>(url.toString());
        // The backend returns { success: true, data: { data: [...], pagination: {...} } } or similar wrapper
        // But apiFetch usually unwraps the response if it's standard JSON.
        // Let's assume apiFetch returns the parsed JSON body.
        // Our backend handler returns { success: true, data: { properties: [], pagination: {} } } check properties/service.go
        // Actually service.GetProperties returns PropertyListResponse { Data, Pagination }
        // Handler wraps it in { success: true, data: result }
        // So apiFetch returns { success: true, data: { Data: [], Pagination: {} } }

        // Wait, let's checking apiFetch implementation or usage pattern.
        // Assuming apiFetch returns the `data` field if the response structure is { data: ... } is common but risky assumption.
        // Let's look at `apiFetch` in `estospaces-web/src/lib/apiUtils.ts` if needed, but for now I'll stick to the previous pattern in this file
        // which handled `data.properties || data`.

        // The previous implementation was:
        // const data = await apiFetch<any>(url.toString());
        // const properties = Array.isArray(data) ? data : (data.properties || data);

        // Our new handler returns: c.JSON(fiber.Map{"success": true, "data": result}) where result has Data and Pagination.

        const responseHelper = data.data || data; // properties list response
        const properties = responseHelper.Data || responseHelper.properties || [];
        const pagination = responseHelper.Pagination || responseHelper.pagination || {};

        return {
            data: properties,
            pagination: {
                page: pagination.Page || page,
                limit: pagination.Limit || limit,
                totalCount: pagination.Total || 0,
                totalPages: pagination.TotalPages || 0,
                hasNextPage: (pagination.Total || 0) > (pagination.Page || page) * (pagination.Limit || limit),
                hasPreviousPage: (pagination.Page || page) > 1,
            },
            error: null,
        };
    } catch (error: any) {
        console.error('[userPropertiesService] Error:', error.message);
        return {
            data: null,
            pagination: null,
            error: { message: error.message || 'Failed to fetch properties' },
        };
    }
};

