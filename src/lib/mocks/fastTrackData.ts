export type SLAStatus = 'on_track' | 'at_risk' | 'breached';
export type PropertyStage = 'submitted' | 'verified' | 'broker_assigned' | 'published';

export interface FastTrackProperty {
    id: string;
    propertyTitle: string;
    location: string;
    submittedAt: string; // ISO string
    currentStage: PropertyStage;
    assignedBroker: string | null;
    slaHoursRemaining: number;
    slaStatus: SLAStatus;
}

const now = new Date();

export const mockFastTrackProperties: FastTrackProperty[] = [
    {
        id: 'FT-001',
        propertyTitle: 'Luxury Penthouse in Downtown',
        location: '123 Main St, Downtown, Metropolis',
        submittedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        currentStage: 'submitted',
        assignedBroker: null,
        slaHoursRemaining: 22,
        slaStatus: 'on_track',
    },
    {
        id: 'FT-002',
        propertyTitle: 'Sunny Villa with Pool',
        location: '456 Palm Way, Suburbia',
        submittedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
        currentStage: 'verified',
        assignedBroker: 'Sarah Jenkins',
        slaHoursRemaining: 6,
        slaStatus: 'on_track',
    },
    {
        id: 'FT-003',
        propertyTitle: 'Modern Loft near Park',
        location: '789 Central Ave, Uptown',
        submittedAt: new Date(now.getTime() - 19 * 60 * 60 * 1000).toISOString(), // 19 hours ago
        currentStage: 'submitted',
        assignedBroker: null,
        slaHoursRemaining: 5,
        slaStatus: 'at_risk',
    },
    {
        id: 'FT-004',
        propertyTitle: 'Cozy Cottage',
        location: '321 Oak Ln, Countryside',
        submittedAt: new Date(now.getTime() - 23.5 * 60 * 60 * 1000).toISOString(), // 23.5 hours ago
        currentStage: 'verified',
        assignedBroker: null,
        slaHoursRemaining: 0.5,
        slaStatus: 'at_risk',
    },
    {
        id: 'FT-005',
        propertyTitle: 'Commercial Office Space',
        location: '101 Business Park, Tech District',
        submittedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        currentStage: 'submitted',
        assignedBroker: null,
        slaHoursRemaining: -1,
        slaStatus: 'breached',
    },
    {
        id: 'FT-006',
        propertyTitle: 'Seaside Apartment',
        location: '555 Ocean Dr, Coastal City',
        submittedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
        currentStage: 'broker_assigned',
        assignedBroker: 'Mike Ross',
        slaHoursRemaining: 14,
        slaStatus: 'on_track',
    },
];
