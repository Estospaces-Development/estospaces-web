/**
 * Analytics Service
 * Fetches analytics data from core-service backend
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

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
    total_users: number;
    total_properties: number;
    total_leads: number;
    active_leads: number;
    total_brokers: number;
    sla_success_rate: number;
    avg_response_time: number;
    pending_verifications: number;
    total_documents: number;
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

/**
 * Fetch analytics data from the core-service backend (Admin Platform Stats)
 * GET /api/v1/admin/analytics (requires admin role)
 */
export const getPlatformAnalytics = async (): Promise<AnalyticsResponse> => {
    try {
        const data = await apiFetch<AnalyticsData>(
            `${CORE_URL()}/api/v1/admin/analytics`,
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
 * GET /api/v1/manager/analytics (requires manager/admin role)
 */
export const getManagerAnalytics = async (): Promise<AnalyticsResponse> => {
    try {
        const data = await apiFetch<AnalyticsData>(
            `${CORE_URL()}/api/v1/manager/analytics`,
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[analyticsService] Error:', error.message);
        return { data: null, error: error.message };
    }
};
