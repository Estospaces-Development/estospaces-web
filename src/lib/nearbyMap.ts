export interface MapCoordinates {
    latitude?: number | null;
    longitude?: number | null;
}

interface MapCandidatePage<T> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
    };
}

export const DASHBOARD_NEARBY_RADIUS_KM = 100;
export const DASHBOARD_NEARBY_PROPERTY_LIMIT = 20;

export interface NearbyMapEmptyState {
    title: string;
    description: string;
    action: 'location-settings' | 'open-property' | null;
    actionLabel: string | null;
}

export const hasValidMapCoordinates = (
    value: MapCoordinates | null | undefined,
): value is { latitude: number; longitude: number } => (
    typeof value?.latitude === 'number'
    && Number.isFinite(value.latitude)
    && value.latitude >= -90
    && value.latitude <= 90
    && typeof value.longitude === 'number'
    && Number.isFinite(value.longitude)
    && value.longitude >= -180
    && value.longitude <= 180
    && !(value.latitude === 0 && value.longitude === 0)
);

export const getNearbyMapEmptyState = (
    properties: MapCoordinates[],
    compact: boolean,
    locationCodeLabel: string,
): NearbyMapEmptyState => {
    const matchingPropertiesWithoutPins = properties.length > 0
        && !properties.some(hasValidMapCoordinates);

    if (!compact && matchingPropertiesWithoutPins) {
        const singular = properties.length === 1;
        return {
            title: singular
                ? 'Map pin unavailable for this matching home'
                : `Map pins unavailable for these ${properties.length} matching homes`,
            description: singular
                ? 'This listing does not have verified coordinates yet, so Estospaces will not place it at an approximate or incorrect location.'
                : 'These listings do not have verified coordinates yet, so Estospaces will not place them at approximate or incorrect locations.',
            action: singular ? 'open-property' : null,
            actionLabel: singular ? 'Open matching home' : null,
        };
    }

    const lowerLocationCodeLabel = locationCodeLabel.toLowerCase();
    return {
        title: `Add a ${lowerLocationCodeLabel} to unlock the map`,
        description: `Use your profile ${lowerLocationCodeLabel} or search a location to see nearby homes without leaving the dashboard.`,
        action: 'location-settings',
        actionLabel: 'Open location settings',
    };
};

export const calculateMapDistanceKm = (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
): number => {
    const radiusKm = 6371;
    const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
    const fromLat = (from.latitude * Math.PI) / 180;
    const toLat = (to.latitude * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLon / 2) ** 2;

    return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const selectDashboardNearbyProperties = <T extends MapCoordinates>(
    properties: T[],
    userLocation: MapCoordinates | null | undefined,
    radiusKm = DASHBOARD_NEARBY_RADIUS_KM,
    limit = DASHBOARD_NEARBY_PROPERTY_LIMIT,
): T[] => {
    if (!hasValidMapCoordinates(userLocation)) {
        return [];
    }

    const anchor = userLocation;

    return properties
        .map((property) => (
            hasValidMapCoordinates(property)
                ? { property, distance: calculateMapDistanceKm(anchor, property) }
                : null
        ))
        .filter((entry): entry is {
            property: T & { latitude: number; longitude: number };
            distance: number;
        } => entry !== null)
        .filter(({ distance }) => distance <= radiusKm)
        .sort((left, right) => left.distance - right.distance)
        .slice(0, limit)
        .map(({ property }) => property);
};

export const loadCompleteMapCandidates = async <T extends { id: string }>(
    loadPage: (page: number, limit: number) => Promise<MapCandidatePage<T>>,
    requestedPageSize = 100,
): Promise<T[]> => {
    const firstPage = await loadPage(1, requestedPageSize);
    if (!firstPage.success) {
        throw new Error('Unable to load nearby map candidates');
    }

    const pageSize = Math.max(1, firstPage.pagination.limit || requestedPageSize);
    const totalPages = Math.max(1, Math.ceil(firstPage.pagination.total / pageSize));
    const remainingPages: MapCandidatePage<T>[] = [];
    for (let page = 2; page <= totalPages; page += 1) {
        remainingPages.push(await loadPage(page, pageSize));
    }

    if (remainingPages.some((page) => !page.success)) {
        throw new Error('Unable to load all nearby map candidates');
    }

    return Array.from(
        new Map(
            [firstPage, ...remainingPages]
                .flatMap((page) => page.data)
                .map((property) => [property.id, property]),
        ).values(),
    );
};
