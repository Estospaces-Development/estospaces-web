/**
 * Analytics Service
 * Fetches analytics data from core-service backend
 */

import { apiFetch, getServiceUrl, getAuthHeaders } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export interface PropertyPerformance {
    property: string;
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
    propertyPerformance: PropertyPerformance[];
    applicationsByProperty: ApplicationByProperty[];
    revenueTrend: TrendData[];
    monthlyApplicationsTrend: TrendData[];
    leadAnalytics: LeadAnalytics;
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

/**
 * Fetch analytics data from the core-service backend (Admin Platform Stats)
 * GET /api/v1/analytics (requires admin role)
 */
export const getPlatformAnalytics = async (): Promise<AnalyticsResponse> => {
    try {
        const data = await apiFetch<AnalyticsData>(
            `${CORE_URL()}/api/v1/analytics`,
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[analyticsService] Error:', error.message);
        return { data: null, error: error.message };
    }
};

// Deprecated alias for backward compatibility
export const getAnalyticsData = getPlatformAnalytics;

/**
 * Fetch analytics data for the current manager
 * GET /api/v1/analytics/manager (requires manager/admin role)
 */
export const getManagerAnalytics = async (): Promise<ManagerAnalyticsResponse> => {
    try {
        const data = await apiFetch<ManagerAnalytics>(
            `${CORE_URL()}/api/v1/analytics/manager`,
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[analyticsService] Error:', error.message);
        return { data: null, error: error.message };
    }
};

