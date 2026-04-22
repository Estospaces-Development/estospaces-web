/**
 * Analytics Service
 * Fetches analytics data from core-service backend
 */

import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export interface PropertyPerformance {
    property: string;
    property_id?: string;
    status?: string;
    views: number;
    applications: number;
    conversionRate: number;
}

export interface ApplicationByProperty {
    label: string;
    value: number;
}

export interface TrendData {
    label: string;
    value: number;
}

export interface LeadAnalytics {
    totalLeads: number;
    totalProperties: number;
    conversionRate: number;
    passed: number;
}

export interface AnalyticsData {
    total_users: number;
    total_properties: number;
    total_leads: number;
    active_leads: number;
    total_brokers: number;
    sla_success_rate: number;
    avg_response_time: number;
    pending_verifications: number;
    total_documents: number;
    total_revenue?: number;
    revenue_growth?: string;
    property_growth?: string;
    total_views?: number;
    views_growth?: string;
    conversion_rate?: number;
    conversion_growth?: string;
    // Legacy fields for manager dashboard
    propertyPerformance?: PropertyPerformance[];
    applicationsByProperty?: ApplicationByProperty[];
    revenueTrend?: TrendData[];
    monthlyApplicationsTrend?: TrendData[];
    leadAnalytics?: LeadAnalytics;
}

export interface AnalyticsResponse {
    data: AnalyticsData | null;
    error: string | null;
}

export interface ManagerAnalytics {
    total_leads: number;
    active_leads: number;
    sla_success_rate: number;
    avg_response_time: number;
}

export interface ManagerAnalyticsResponse {
    data: ManagerAnalytics | null;
    error: string | null;
}

// Basic in-memory cache to prevent pounding the API
const CACHE_TTL = 30000; // 30 seconds
const analyticsCache: Record<string, { data: any; timestamp: number }> = {};
const ANALYTICS_CACHE_KEYS = ['platform_analytics', 'manager_analytics'] as const;
export type AnalyticsCacheKey = typeof ANALYTICS_CACHE_KEYS[number];

export const invalidateAnalyticsCache = (...keys: AnalyticsCacheKey[]) => {
    const targets = keys.length > 0 ? keys : ANALYTICS_CACHE_KEYS;
    targets.forEach((key) => {
        delete analyticsCache[key];
    });
};

/**
 * Fetch analytics data from the core-service backend (Admin Platform Stats)
 * GET /api/v1/admin/analytics (requires admin role)
 */
export const getPlatformAnalytics = async (forceRefresh = false): Promise<AnalyticsResponse> => {
    const cacheKey = 'platform_analytics';
    const now = Date.now();

    if (!forceRefresh && analyticsCache[cacheKey] && (now - analyticsCache[cacheKey].timestamp < CACHE_TTL)) {
        return { data: analyticsCache[cacheKey].data, error: null };
    }

    try {
        const data = await apiFetch<AnalyticsData>(
            `${CORE_URL()}/api/v1/admin/analytics`,
        );
        analyticsCache[cacheKey] = { data, timestamp: now };
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

// Deprecated alias for backward compatibility
export const getAnalyticsData = getPlatformAnalytics;

/**
 * Fetch analytics data for the current manager
 * GET /api/v1/manager/analytics (requires manager/admin role)
 */
export const getManagerAnalytics = async (forceRefresh = false): Promise<AnalyticsResponse> => {
    const cacheKey = 'manager_analytics';
    const now = Date.now();

    if (!forceRefresh && analyticsCache[cacheKey] && (now - analyticsCache[cacheKey].timestamp < CACHE_TTL)) {
        return { data: analyticsCache[cacheKey].data, error: null };
    }

    try {
        const data = await apiFetch<AnalyticsData>(
            `${CORE_URL()}/api/v1/manager/analytics`,
        );
        analyticsCache[cacheKey] = { data, timestamp: now };
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};
