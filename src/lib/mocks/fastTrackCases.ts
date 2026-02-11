export type FastTrackStep =
    | 'documents'
    | 'owner_approval'
    | 'legal_check'
    | 'payment_ready'
    | 'completed';

export type PropertyType = 'rent' | 'lease' | 'buy';

export type DocStatus = 'pending' | 'verified';

export interface FastTrackDocuments {
    idProof: DocStatus;
    incomeProof: DocStatus;
    propertyDocs: DocStatus;
}

export interface FastTrackCase {
    caseId: string;
    propertyTitle: string;
    propertyType: PropertyType;
    clientName: string;
    submittedAt: string; // ISO string
    hoursRemaining: number;
    currentStep: FastTrackStep;
    documents: FastTrackDocuments;
    finalStatus: 'in_progress' | 'completed' | 'expired';
}

const now = new Date();

export const mockFastTrackCases: FastTrackCase[] = [
    {
        caseId: 'FT-101',
        propertyTitle: 'Sunset Height Apartment',
        propertyType: 'rent',
        clientName: 'Alice Johnson',
        submittedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        hoursRemaining: 22,
        currentStep: 'documents',
        documents: {
            idProof: 'verified',
            incomeProof: 'pending',
            propertyDocs: 'pending'
        },
        finalStatus: 'in_progress'
    },
    {
        caseId: 'FT-102',
        propertyTitle: 'Downtown Commercial Space',
        propertyType: 'lease',
        clientName: 'TechStart Inc.',
        submittedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(),
        hoursRemaining: 14,
        currentStep: 'owner_approval',
        documents: {
            idProof: 'verified',
            incomeProof: 'verified',
            propertyDocs: 'verified'
        },
        finalStatus: 'in_progress'
    },
    {
        caseId: 'FT-103',
        propertyTitle: 'Lakeside Villa',
        propertyType: 'buy',
        clientName: 'Robert & Sarah Smith',
        submittedAt: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(),
        hoursRemaining: 1,
        currentStep: 'legal_check',
        documents: {
            idProof: 'verified',
            incomeProof: 'verified',
            propertyDocs: 'verified'
        },
        finalStatus: 'in_progress'
    },
    {
        caseId: 'FT-104',
        propertyTitle: 'Suburban Family Home',
        propertyType: 'rent',
        clientName: 'Michael Chen',
        submittedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
        hoursRemaining: 0,
        currentStep: 'documents',
        documents: {
            idProof: 'pending',
            incomeProof: 'pending',
            propertyDocs: 'pending'
        },
        finalStatus: 'expired'
    },
    {
        caseId: 'FT-105',
        propertyTitle: 'City Center Loft',
        propertyType: 'buy',
        clientName: 'Emma Davis',
        submittedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        hoursRemaining: 19,
        currentStep: 'completed',
        documents: {
            idProof: 'verified',
            incomeProof: 'verified',
            propertyDocs: 'verified'
        },
        finalStatus: 'completed'
    },
    {
        caseId: 'FT-106',
        propertyTitle: 'Beachfront Condo',
        propertyType: 'lease',
        clientName: 'Holiday Rentals LLC',
        submittedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
        hoursRemaining: 4,
        currentStep: 'payment_ready',
        documents: {
            idProof: 'verified',
            incomeProof: 'verified',
            propertyDocs: 'verified'
        },
        finalStatus: 'in_progress'
    }
];
