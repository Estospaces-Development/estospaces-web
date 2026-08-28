import type { SearchResult } from '@/services/searchService';
import {
    formatLaunchPropertyLocation,
    formatLaunchPropertyText,
    LAUNCH_COUNTRY_NAME,
} from '@/lib/launchLocale';
import { getVerifiedPropertyMapCoordinates } from '@/lib/mapCoordinates';

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

export const toDiscoverNearbyMapProperties = (properties: SearchResult[]): DiscoverNearbyMapProperty[] => (
    properties.map((property) => {
        const coordinates = getVerifiedPropertyMapCoordinates({
            latitude: property.latitude,
            longitude: property.longitude,
            country: property.country,
            countryCode: property.countryCode,
            city: property.city,
            postcode: property.postcode,
            address: property.location,
        });

        return {
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
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
        };
    })
);
