import type { Lead } from '@/services/leadsService';
import {
    LAUNCH_COUNTRY_CODE,
    UK_COUNTRY_CODE,
    getSupportedLaunchCountry,
} from '@/lib/launchLocale';
import { inferSearchMarketFromText } from '@/lib/propertySearchControls';

export type LeadMapCoordinates = [latitude: number, longitude: number];

const INDIA_MAP_BOUNDS = {
    minLatitude: 6,
    maxLatitude: 38,
    minLongitude: 68,
    maxLongitude: 98,
};

const UK_MAP_BOUNDS = {
    minLatitude: 49,
    maxLatitude: 61,
    minLongitude: -11,
    maxLongitude: 3,
};

const isInsideBounds = (
    coordinates: LeadMapCoordinates,
    bounds: typeof INDIA_MAP_BOUNDS,
) => (
    coordinates[0] >= bounds.minLatitude
    && coordinates[0] <= bounds.maxLatitude
    && coordinates[1] >= bounds.minLongitude
    && coordinates[1] <= bounds.maxLongitude
);

const getLeadPropertyMarket = (lead: Lead) => {
    const property = lead.property;
    if (!property) {
        return null;
    }

    return getSupportedLaunchCountry(property.country_code, property.country, property.postcode)
        || inferSearchMarketFromText(property.city)
        || inferSearchMarketFromText(property.address_line_1);
};

export const getLeadMapCoordinates = (lead: Lead): LeadMapCoordinates | null => {
    const latitude = lead.property?.latitude;
    const longitude = lead.property?.longitude;

    if (
        typeof latitude !== 'number'
        || typeof longitude !== 'number'
        || !Number.isFinite(latitude)
        || !Number.isFinite(longitude)
        || latitude < -85
        || latitude > 85
        || longitude < -180
        || longitude > 180
        || (latitude === 0 && longitude === 0)
    ) {
        return null;
    }

    const coordinates: LeadMapCoordinates = [latitude, longitude];
    const market = getLeadPropertyMarket(lead);

    if (!market) {
        return null;
    }
    if (market === LAUNCH_COUNTRY_CODE && !isInsideBounds(coordinates, INDIA_MAP_BOUNDS)) {
        return null;
    }
    if (market === UK_COUNTRY_CODE && !isInsideBounds(coordinates, UK_MAP_BOUNDS)) {
        return null;
    }

    return coordinates;
};
