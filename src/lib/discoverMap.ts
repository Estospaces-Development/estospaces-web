import type { SearchResult } from '@/services/searchService';
import {
    formatLaunchPropertyLocation,
    formatLaunchPropertyText,
    LAUNCH_COUNTRY_NAME,
} from '@/lib/launchLocale';

export interface DiscoverNearbyMapProperty {
    id: string;
    title: string;
    address_line_1: string;
    city: string;
    postcode: string;
    price: number;
    currency?: string;
    country?: string;
    countryCode?: string;
    property_type: string;
    bedrooms: number;
    bathrooms: number;
    latitude?: number;
    longitude?: number;
}

const normalizeCoordinate = (value?: number | null) => (
    typeof value === 'number' && Number.isFinite(value) ? value : undefined
);

export const toDiscoverNearbyMapProperties = (properties: SearchResult[]): DiscoverNearbyMapProperty[] => (
    properties.map((property) => ({
        id: property.id,
        title: formatLaunchPropertyText(property.title),
        address_line_1: formatLaunchPropertyLocation(property.location || property.city || property.postcode || LAUNCH_COUNTRY_NAME),
        city: formatLaunchPropertyLocation(property.city),
        postcode: property.postcode || '',
        price: property.price || 0,
        currency: property.currency || undefined,
        country: property.country || undefined,
        countryCode: property.countryCode || undefined,
        property_type: property.listing_type || property.property_type || '',
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        latitude: normalizeCoordinate(property.latitude),
        longitude: normalizeCoordinate(property.longitude),
    }))
);
