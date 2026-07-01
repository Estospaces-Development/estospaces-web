import type { PropertyPerformance } from '@/services/analyticsService';

export const MANAGER_LIVE_LISTINGS_VIEW = 'live';
export const MANAGER_LIVE_LISTINGS_STATUS_FILTERS = [
    'available',
    'published',
    'online',
    'active',
] as const;
export const MANAGER_LIVE_LISTINGS_STATUS_FILTER = MANAGER_LIVE_LISTINGS_STATUS_FILTERS[0];

const LIVE_PROPERTY_STATUSES = new Set<string>([
    ...MANAGER_LIVE_LISTINGS_STATUS_FILTERS,
]);

const normalizeStatusToken = (value?: string | null) => value?.trim().toLowerCase() || '';

type ManagerFastTrackMetricCase = {
    workspaceFinalStatus?: string | null;
    finalStatus?: string | null;
    hoursRemaining?: number | null;
};

const normalizeFastTrackFinalStatus = (
    value?: string | null,
    fallback?: string | null,
) => {
    const normalized = normalizeStatusToken(value) || normalizeStatusToken(fallback);

    if (normalized === 'completed') {
        return 'completed';
    }
    if (['cancelled', 'expired', 'rejected'].includes(normalized)) {
        return 'cancelled';
    }

    return 'active';
};

export const normalizeManagerAnalyticsPercentage = (value?: number | null) => {
    const numericValue = Number(value ?? 0);

    if (!Number.isFinite(numericValue)) {
        return 0;
    }

    return Math.min(Math.max(numericValue, 0), 100);
};

export const formatManagerAnalyticsPercentage = (value?: number | null) => {
    const normalizedValue = normalizeManagerAnalyticsPercentage(value);
    const formattedValue = Number.isInteger(normalizedValue)
        ? `${normalizedValue}`
        : normalizedValue.toFixed(2).replace(/\.?0+$/, '');

    return `${formattedValue}%`;
};

export const normalizeManagerPropertyStatusFilters = (
    statuses?: readonly (string | null | undefined)[],
) => {
    const unique = new Set<string>();

    (statuses || []).forEach((status) => {
        const normalized = normalizeStatusToken(status);
        if (normalized) {
            unique.add(normalized);
        }
    });

    return Array.from(unique);
};

export const managerPropertyStatusFiltersEqual = (
    left?: readonly (string | null | undefined)[],
    right?: readonly (string | null | undefined)[],
) => {
    const normalizedLeft = normalizeManagerPropertyStatusFilters(left);
    const normalizedRight = normalizeManagerPropertyStatusFilters(right);

    if (normalizedLeft.length !== normalizedRight.length) {
        return false;
    }

    return normalizedLeft.every((status, index) => status === normalizedRight[index]);
};

export const isManagerLivePropertyStatus = (status?: string | null) => (
    LIVE_PROPERTY_STATUSES.has(normalizeStatusToken(status))
);

export const filterManagerLivePropertyPerformance = (
    propertyPerformance?: readonly PropertyPerformance[] | null,
) => (
    (propertyPerformance || []).filter((property) => isManagerLivePropertyStatus(property.status))
);

export const getManagerLiveListingCount = (
    analytics?: {
        active_listings?: number | null;
        total_properties?: number | null;
        leadAnalytics?: { totalProperties?: number | null } | null;
        propertyPerformance?: readonly PropertyPerformance[] | null;
    } | null,
    fallbackProperties?: readonly { status?: string | null }[] | null,
    liveListingTotal?: number | null,
) => {
    const numericLiveListingTotal = Number(liveListingTotal);
    if (Number.isFinite(numericLiveListingTotal)) {
        return Math.max(0, numericLiveListingTotal);
    }

    const analyticsCount = analytics?.active_listings
        ?? analytics?.total_properties
        ?? analytics?.leadAnalytics?.totalProperties;
    const numericAnalyticsCount = Number(analyticsCount);

    if (Number.isFinite(numericAnalyticsCount)) {
        return Math.max(0, numericAnalyticsCount);
    }

    if (analytics?.propertyPerformance) {
        return filterManagerLivePropertyPerformance(analytics.propertyPerformance).length;
    }

    return (fallbackProperties || []).filter((property) => (
        isManagerLivePropertyStatus(property.status)
    )).length;
};

export const getManagerFastTrackSummary = (
    cases?: readonly ManagerFastTrackMetricCase[] | null,
) => {
    const summary = {
        active: 0,
        completed: 0,
        cancelled: 0,
        closingSoon: 0,
    };

    (cases || []).forEach((caseItem) => {
        const status = normalizeFastTrackFinalStatus(
            caseItem.workspaceFinalStatus,
            caseItem.finalStatus,
        );

        summary[status] += 1;

        const hoursRemaining = Number(caseItem.hoursRemaining ?? 0);
        if (
            status === 'active'
            && Number.isFinite(hoursRemaining)
            && hoursRemaining > 0
            && hoursRemaining <= 6
        ) {
            summary.closingSoon += 1;
        }
    });

    return summary;
};

export const getManagerApplicationCount = (
    analytics?: {
        total_applications?: number | null;
        propertyPerformance?: readonly PropertyPerformance[] | null;
    } | null,
) => {
    const analyticsTotal = Number(analytics?.total_applications);
    if (Number.isFinite(analyticsTotal)) {
        return Math.max(0, analyticsTotal);
    }

    return (analytics?.propertyPerformance || []).reduce((total, property) => (
        total + (property.applications || 0)
    ), 0);
};

export const getManagerPropertyStatusFilters = (searchParams: URLSearchParams) => (
    normalizeManagerPropertyStatusFilters(
        (searchParams.get('status') || '').split(','),
    )
);

export const buildManagerPropertySearchParams = (
    current: URLSearchParams,
    statuses?: readonly (string | null | undefined)[],
) => {
    const next = new URLSearchParams(current);
    const normalizedStatuses = normalizeManagerPropertyStatusFilters(statuses);

    next.delete('status');
    next.delete('view');

    if (normalizedStatuses.length > 0) {
        next.set('status', normalizedStatuses.join(','));
    }

    return next;
};

type ManagerLivePresetFilters = {
    search?: string;
    priceMin?: number;
    priceMax?: number;
    bedroomsMin?: number;
    propertyType?: readonly string[];
    status?: readonly (string | null | undefined)[];
};

export const buildManagerLivePresetFilters = <T extends ManagerLivePresetFilters>(
    filters: T,
    statuses?: readonly (string | null | undefined)[],
) => ({
    ...filters,
    priceMin: undefined,
    priceMax: undefined,
    bedroomsMin: undefined,
    propertyType: undefined,
    status: normalizeManagerPropertyStatusFilters(statuses),
});

export const buildManagerActiveListingsPath = () => {
    const params = new URLSearchParams();
    params.set('view', MANAGER_LIVE_LISTINGS_VIEW);
    params.set('status', MANAGER_LIVE_LISTINGS_STATUS_FILTERS.join(','));

    return `/manager/dashboard/properties?${params.toString()}`;
};
