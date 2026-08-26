import type { Lead } from '@/services/leadsService';

export type LeadMapCoordinates = [latitude: number, longitude: number];

export const getLeadMapCoordinates = (lead: Lead): LeadMapCoordinates | null => {
    const latitude = lead.property?.latitude;
    const longitude = lead.property?.longitude;

    if (
        typeof latitude !== 'number'
        || typeof longitude !== 'number'
        || !Number.isFinite(latitude)
        || !Number.isFinite(longitude)
        || latitude < -90
        || latitude > 90
        || longitude < -180
        || longitude > 180
    ) {
        return null;
    }

    return [latitude, longitude];
};
