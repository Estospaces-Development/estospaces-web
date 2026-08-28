import type { Lead } from '@/services/leadsService';
import { getVerifiedPropertyMapCoordinates } from '@/lib/mapCoordinates';

export type LeadMapCoordinates = [latitude: number, longitude: number];

export const getLeadMapCoordinates = (lead: Lead): LeadMapCoordinates | null => {
    const coordinates = getVerifiedPropertyMapCoordinates(lead.property);
    return coordinates ? [coordinates.latitude, coordinates.longitude] : null;
};
