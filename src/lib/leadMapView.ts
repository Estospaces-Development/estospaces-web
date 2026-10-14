import type { Lead } from '@/services/leadsService';
import { getLeadMapCoordinates, type LeadMapCoordinates } from '@/lib/leadMap';

export interface LeadMapGroup {
    key: string;
    coordinates: LeadMapCoordinates;
    leads: Lead[];
}

/** One group per verified location, so leads that share coordinates stay reachable behind a single marker (#713). */
export const groupLeadsByLocation = (leads: Lead[]): LeadMapGroup[] => {
    const groups = new Map<string, LeadMapGroup>();
    for (const lead of leads) {
        const coordinates = getLeadMapCoordinates(lead);
        if (!coordinates) {
            continue;
        }
        const key = coordinates.join(':');
        const group = groups.get(key);
        if (group) {
            group.leads.push(lead);
        } else {
            groups.set(key, { key, coordinates, leads: [lead] });
        }
    }
    return [...groups.values()];
};

export type LeadMapActionId = 'messages' | 'documents' | 'viewing' | 'property';

/** Single action list for both the marker popup and the Selected lead panel (#720). */
export const getLeadMapActions = ({ canRequestDocuments, canSchedule, hasProperty }: {
    canRequestDocuments: boolean;
    canSchedule: boolean;
    hasProperty: boolean;
}): { id: LeadMapActionId; label: string }[] => [
    { id: 'messages' as const, label: 'Open messages' },
    ...(canRequestDocuments ? [{ id: 'documents' as const, label: 'Request documents' }] : []),
    ...(canSchedule ? [{ id: 'viewing' as const, label: 'Schedule viewing' }] : []),
    ...(hasProperty ? [{ id: 'property' as const, label: 'Open property' }] : []),
];

/** Switcher labels for leads sharing a marker: the client, plus the property whenever two leads share a client name
 * (one client asking about two homes showed "Maya Demo" twice, #713 dev check). */
export const getLeadMapSwitcherLabels = (leads: Lead[]): string[] => {
    const clientOf = (lead: Lead) => lead.name || lead.email || lead.lead_number || 'Client enquiry';
    const counts = new Map<string, number>();
    for (const lead of leads) {
        counts.set(clientOf(lead), (counts.get(clientOf(lead)) ?? 0) + 1);
    }
    return leads.map((lead) => {
        const client = clientOf(lead);
        const property = lead.property?.title || lead.property_name;
        return (counts.get(client) ?? 0) > 1 && property ? `${client} · ${property}` : client;
    });
};
