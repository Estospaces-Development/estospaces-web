const USER_PROPERTY_DISCOVERY_PATH = '/user/dashboard/discover';

function normalizeLocationSuffix(value: string, prefix: '?' | '#'): string {
    if (!value) {
        return '';
    }

    return value.startsWith(prefix) ? value : `${prefix}${value}`;
}

export function buildUserDashboardPropertyPath(
    propertyId: string | undefined,
    search = '',
    hash = '',
): string {
    const normalizedPropertyId = propertyId?.trim();

    if (!normalizedPropertyId || normalizedPropertyId === ':id') {
        return USER_PROPERTY_DISCOVERY_PATH;
    }

    return `/user/dashboard/properties/${encodeURIComponent(normalizedPropertyId)}`
        + normalizeLocationSuffix(search, '?')
        + normalizeLocationSuffix(hash, '#');
}
