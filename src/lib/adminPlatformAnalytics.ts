import type { AnalyticsData } from '@/services/analyticsService';
import type { PropertyPerformance } from '@/services/analyticsService';

export type AdminAnalyticsIconKey =
    | 'activity'
    | 'building'
    | 'eye'
    | 'file'
    | 'trending'
    | 'users'
    | 'zap';

export interface AdminAnalyticsDisplayItem {
    id: string;
    label: string;
    value: string;
    icon: AdminAnalyticsIconKey;
    color: string;
    detail?: string;
}

const ADMIN_LIVE_LISTING_STATUSES = new Set(['active', 'available', 'online', 'published']);

const numericValue = (value?: number | null) => Number(value ?? 0);

export const formatAdminNumber = (value?: number | null) => (
    Math.round(numericValue(value)).toLocaleString('en-GB')
);

export const formatAdminCurrency = (value?: number | null) => (
    new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0,
    }).format(numericValue(value))
);

const formatAdminPercentage = (value?: number | null) => `${numericValue(value)}%`;

const formatGrowthValue = (value?: string | null) => value?.trim() || '0%';

export type AdminAnalyticsExportSortBy = 'property' | 'views' | 'applications' | 'conversionRate';
export type AdminAnalyticsExportDirection = 'asc' | 'desc';

export interface AdminAnalyticsExportOptions {
    status?: string;
    sortBy?: AdminAnalyticsExportSortBy;
    direction?: AdminAnalyticsExportDirection;
}

export const getAdminTotalBookings = (data?: AnalyticsData | null) => (
    data?.total_bookings ?? data?.total_applications ?? data?.total_leads ?? 0
);

export const getAdminActiveListings = (data?: AnalyticsData | null) => {
    if (data?.active_listings !== undefined) {
        return data.active_listings;
    }

    const livePerformanceRows = (data?.propertyPerformance || []).filter((property) => (
        ADMIN_LIVE_LISTING_STATUSES.has(property.status?.trim().toLowerCase() || '')
    ));

    return livePerformanceRows.length || data?.total_properties || 0;
};

export const buildAdminAnalyticsMetricCards = (
    data?: AnalyticsData | null,
): AdminAnalyticsDisplayItem[] => [
    {
        id: 'leads',
        label: 'Total Leads',
        value: formatAdminNumber(data?.total_leads),
        icon: 'users',
        color: 'text-blue-500',
        detail: formatGrowthValue(data?.conversion_growth),
    },
    {
        id: 'properties',
        label: 'Total Properties',
        value: formatAdminNumber(data?.total_properties),
        icon: 'activity',
        color: 'text-purple-500',
        detail: formatGrowthValue(data?.property_growth),
    },
    {
        id: 'views',
        label: 'Total Views',
        value: formatAdminNumber(data?.total_views),
        icon: 'eye',
        color: 'text-green-500',
        detail: formatGrowthValue(data?.views_growth),
    },
    {
        id: 'conversion',
        label: 'Conversion Rate',
        value: formatAdminPercentage(data?.conversion_rate),
        icon: 'zap',
        color: 'text-orange-500',
        detail: formatGrowthValue(data?.conversion_growth),
    },
    {
        id: 'revenue',
        label: 'Total Revenue',
        value: formatAdminCurrency(data?.total_revenue),
        icon: 'trending',
        color: 'text-emerald-500',
        detail: formatGrowthValue(data?.revenue_growth),
    },
    {
        id: 'revenue-growth',
        label: 'Revenue Growth',
        value: formatGrowthValue(data?.revenue_growth),
        icon: 'trending',
        color: 'text-indigo-500',
        detail: 'Month over month',
    },
    {
        id: 'property-growth',
        label: 'Property Growth',
        value: formatGrowthValue(data?.property_growth),
        icon: 'building',
        color: 'text-sky-500',
        detail: 'Listing growth',
    },
    {
        id: 'views-growth',
        label: 'Views Growth',
        value: formatGrowthValue(data?.views_growth),
        icon: 'eye',
        color: 'text-teal-500',
        detail: 'Traffic growth',
    },
];

const numberForExport = (value?: number | null) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const buildAdminAnalyticsExportRows = (
    data?: AnalyticsData | null,
    options: AdminAnalyticsExportOptions = {},
): PropertyPerformance[] => {
    const status = options.status?.trim().toLowerCase();
    const sortBy = options.sortBy || 'views';
    const direction = options.direction || 'desc';

    const rows = (data?.propertyPerformance || [])
        .filter((row) => !status || status === 'all' || row.status?.trim().toLowerCase() === status)
        .map((row) => ({
            ...row,
            property: row.property || 'Untitled path',
            views: numberForExport(row.views),
            applications: numberForExport(row.applications),
            conversionRate: numberForExport(row.conversionRate),
        }));

    return rows.sort((left, right) => {
        const modifier = direction === 'asc' ? 1 : -1;
        if (sortBy === 'property') {
            return left.property.localeCompare(right.property) * modifier;
        }
        return (numberForExport(left[sortBy]) - numberForExport(right[sortBy])) * modifier;
    });
};

const csvSafeValue = (value: string | number) => {
    let text = String(value);
    if (/^[=+\-@]/.test(text)) {
        text = `'${text}`;
    }
    return `"${text.replace(/"/g, '""')}"`;
};

export const buildAdminAnalyticsCsvSnapshot = (
    data?: AnalyticsData | null,
    options: AdminAnalyticsExportOptions = {},
) => {
    const rows = buildAdminAnalyticsExportRows(data, options);
    return [
        ['Property', 'Views', 'Applications', 'Conversion Rate'],
        ...rows.map((row) => [
            row.property,
            String(row.views),
            String(row.applications),
            String(row.conversionRate),
        ]),
    ]
        .map((row) => row.map(csvSafeValue).join(','))
        .join('\n');
};

export const createAdminAnalyticsExportDeduper = (windowMs = 1000) => {
    let lastStartedAt = 0;

    return {
        canStart(now = Date.now()) {
            return lastStartedAt === 0 || now - lastStartedAt > windowMs;
        },
        markStarted(now = Date.now()) {
            lastStartedAt = now;
        },
    };
};

export const buildAdminDashboardSnapshot = (
    data?: AnalyticsData | null,
): AdminAnalyticsDisplayItem[] => [
    { id: 'users', label: 'Total Users', value: formatAdminNumber(data?.total_users), icon: 'users', color: 'text-blue-500' },
    { id: 'properties', label: 'Total Properties', value: formatAdminNumber(data?.total_properties), icon: 'building', color: 'text-emerald-500' },
    { id: 'bookings', label: 'Total Bookings', value: formatAdminNumber(getAdminTotalBookings(data)), icon: 'file', color: 'text-sky-500' },
    { id: 'revenue', label: 'Revenue', value: formatAdminCurrency(data?.total_revenue), icon: 'trending', color: 'text-green-500' },
    { id: 'active-listings', label: 'Active Listings', value: formatAdminNumber(getAdminActiveListings(data)), icon: 'activity', color: 'text-orange-500' },
    { id: 'brokers', label: 'Verified Brokers', value: formatAdminNumber(data?.total_brokers), icon: 'zap', color: 'text-purple-500' },
    { id: 'pending', label: 'Pending Verifications', value: formatAdminNumber(data?.pending_verifications), icon: 'activity', color: 'text-amber-500' },
];
