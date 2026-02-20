import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const BOOKING_URL = () => getServiceUrl('booking');

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

// Backend Model structure
interface BackendFastTrackCase {
    id: string;
    property_id: string;
    client_id: string;
    client_name: string;
    property_title: string;
    property_type: PropertyType;
    current_step: FastTrackStep;
    final_status: 'in_progress' | 'completed' | 'expired' | 'rejected';
    documents: FastTrackDocuments;
    submitted_at: string;
    updated_at: string;
    hours_remaining: number;
}

// Frontend Model structure (matching existing components)
export interface FastTrackCase {
    caseId: string;
    propertyTitle: string;
    propertyType: PropertyType;
    clientName: string;
    submittedAt: string;
    hoursRemaining: number;
    currentStep: FastTrackStep;
    documents: FastTrackDocuments;
    finalStatus: 'in_progress' | 'completed' | 'expired';
    // extra fields to preserve ID
    id: string;
}

// Mapper function
const mapBackendToFrontend = (apiCase: BackendFastTrackCase): FastTrackCase => ({
    caseId: apiCase.id,
    id: apiCase.id,
    propertyTitle: apiCase.property_title,
    propertyType: apiCase.property_type,
    clientName: apiCase.client_name,
    submittedAt: apiCase.submitted_at,
    hoursRemaining: apiCase.hours_remaining,
    currentStep: apiCase.current_step,
    documents: apiCase.documents,
    finalStatus: apiCase.final_status === 'rejected' ? 'expired' : apiCase.final_status // mapping rejected to expired if UI doesn't support rejected yet
});

export interface CreateFastTrackRequest {
    property_id: string;
    client_id: string;
    client_name: string;
    property_title: string;
    property_type: PropertyType;
}

export interface UpdateFastTrackRequest {
    current_step?: string;
    final_status?: string;
    documents?: FastTrackDocuments;
}

export const getFastTrackCases = async () => {
    try {
        const result = await apiFetch<BackendFastTrackCase[]>(`${BOOKING_URL()}/api/v1/fast-track`);
        if (result) {
            return { data: result.map(mapBackendToFrontend), error: null };
        }
        return { data: [], error: null };
    } catch (error: any) {
        console.error('Error fetching fast track cases:', error);
        return { data: null, error: error.message };
    }
};

export const getFastTrackCaseById = async (id: string) => {
    try {
        const result = await apiFetch<BackendFastTrackCase>(`${BOOKING_URL()}/api/v1/fast-track/${id}`);
        if (result) {
            return { data: mapBackendToFrontend(result), error: null };
        }
        return { data: null, error: 'Case not found' };
    } catch (error: any) {
        console.error('Error fetching fast track case:', error);
        return { data: null, error: error.message };
    }
};

export const createFastTrackCase = async (req: CreateFastTrackRequest) => {
    try {
        const result = await apiFetch<BackendFastTrackCase>(`${BOOKING_URL()}/api/v1/fast-track`, {
            method: 'POST',
            body: JSON.stringify(req)
        });
        if (result) {
            return { data: mapBackendToFrontend(result), error: null };
        }
        return { data: null, error: 'Failed to create case' };
    } catch (error: any) {
        console.error('Error creating fast track case:', error);
        return { data: null, error: error.message };
    }
};

export const updateFastTrackCase = async (id: string, req: UpdateFastTrackRequest) => {
    try {
        // Map frontend fields back to backend if necessary, but update request is simple
        const result = await apiFetch<BackendFastTrackCase>(`${BOOKING_URL()}/api/v1/fast-track/${id}`, {
            method: 'PUT',
            body: JSON.stringify(req)
        });
        if (result) {
            return { data: mapBackendToFrontend(result), error: null };
        }
        return { data: null, error: 'Failed to update case' };
    } catch (error: any) {
        console.error('Error updating fast track case:', error);
        return { data: null, error: error.message };
    }
};
