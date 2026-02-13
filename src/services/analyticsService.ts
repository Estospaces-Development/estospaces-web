/**
 * Analytics Service
 * Returns mock data for analytics charts and graphs (no backend API calls)
 */

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

/**
 * Fetch analytics data for charts and graphs
 */
export const getAnalyticsData = async (): Promise<AnalyticsResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
        data: {
            propertyPerformance: [
                { property: 'Sunset Villa', views: 1245, applications: 25, conversionRate: 2.1 },
                { property: 'Downtown Loft', views: 980, applications: 32, conversionRate: 3.3 },
                { property: 'Green Heights', views: 850, applications: 18, conversionRate: 2.1 },
                { property: 'Luxury Penthouse', views: 2400, applications: 45, conversionRate: 1.9 },
                { property: 'Cozy Cottage', views: 450, applications: 12, conversionRate: 2.7 }
            ],
            applicationsByProperty: [
                { label: 'Luxury Penthouse', value: 45 },
                { label: 'Downtown Loft', value: 32 },
                { label: 'Sunset Villa', value: 25 },
                { label: 'Green Heights', value: 18 },
                { label: 'Cozy Cottage', value: 12 }
            ],
            revenueTrend: [
                { label: 'Jan', value: 38 },
                { label: 'Feb', value: 42 },
                { label: 'Mar', value: 35 },
                { label: 'Apr', value: 55 },
                { label: 'May', value: 48 },
                { label: 'Jun', value: 65 }
            ],
            monthlyApplicationsTrend: [
                { label: 'Jan', value: 18 },
                { label: 'Feb', value: 24 },
                { label: 'Mar', value: 20 },
                { label: 'Apr', value: 35 },
                { label: 'May', value: 28 },
                { label: 'Jun', value: 42 }
            ],
            leadAnalytics: {
                totalLeads: 247,
                totalProperties: 39,
                conversionRate: 14.7,
                passed: 18.2,
            },
        },
        error: null,
    };
};
