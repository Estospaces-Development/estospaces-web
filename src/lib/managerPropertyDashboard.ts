import type { PropertyPerformance } from '@/services/analyticsService';

export const MANAGER_LIVE_LISTINGS_VIEW = 'live';
export const MANAGER_LIVE_LISTINGS_STATUS_FILTERS = [
    'available',
    'published',
    'online',
    'active',
] as const;
export const MANAGER_LIVE_LISTINGS_STATUS_FILTER = MANAGER_LIVE_LISTINGS_STATUS_FILTERS[0];

const LIVE_PROPERTY_STATUSES = new Set([
    ...MANAGER_LIVE_LISTINGS_STATUS_FILTERS,
]);

const normalizeStatusToken = (value?: string | null) => value?.trim().toLowerCase() || '';

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

export const buildManagerActiveListingsPath = () => {
    const params = new URLSearchParams();
    params.set('view', MANAGER_LIVE_LISTINGS_VIEW);
    params.set('status', MANAGER_LIVE_LISTINGS_STATUS_FILTERS.join(','));

    return `/manager/dashboard/properties?${params.toString()}`;
};
