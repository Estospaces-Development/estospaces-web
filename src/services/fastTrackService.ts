import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import type { ApiFetchOptions } from '@/lib/apiUtils';

const BOOKING_URL = () => getServiceUrl('booking');

type ServiceRequestOptions = Pick<ApiFetchOptions, 'suppressErrorToast'>;

export type FastTrackStep =
    | 'property_selected'
    | 'documents_requested'
    | 'documents_verified'
    | 'viewing_scheduled'
    | 'viewing_completed'
    | 'application_in_review'
    | 'ready_for_contract'
    | 'completed';

export type PropertyType = 'rent' | 'lease' | 'buy' | 'sale';

export type DocStatus = 'pending' | 'verified';

export interface FastTrackDocuments {
    identityProof: DocStatus;
    addressProof: DocStatus;
}

// Backend Model structure
interface BackendFastTrackCase {
    id: string;
    property_id: string;
    property_country?: string;
    broker_request_id?: string;
    lead_id?: string;
    manager_id?: string;
    client_id: string;
    client_name: string;
    property_title: string;
    property_type: PropertyType;
    listing_type?: 'rent' | 'sale' | 'lease';
    started_from?: 'direct_property' | 'broker_request_selection';
    current_step: FastTrackStep;
    final_status: 'in_progress' | 'completed' | 'expired' | 'rejected';
    documents: FastTrackDocuments;
    journey_type?: 'rent' | 'buy';
    journey_source?: 'direct_property' | 'broker_request_selection';
    journey_stage?: string;
    next_action?: string;
    next_action_target?: string;
    status_reason?: string;
    blocking_requirements?: string[];
    pending_requirements?: string[];
    completed_requirements?: string[];
    override_reason?: string;
    override_by?: string;
    override_at?: string;
    jurisdiction?: string;
    compliance_pack?: string;
    required_compliance_items?: string[];
    completed_compliance_items?: string[];
    blocked_by_compliance?: boolean;
    compliance_status_reason?: string;
    submitted_at: string;
    expires_at?: string;
    updated_at: string;
    hours_remaining: number;
}

// Frontend Model structure (matching existing components)
export interface FastTrackCase {
    caseId: string;
    propertyTitle: string;
    propertyType: PropertyType;
    propertyCountry?: string;
    clientName: string;
    clientId: string;
    propertyId: string;
    brokerRequestId?: string;
    leadId?: string;
    managerId?: string;
    listingType?: 'rent' | 'sale' | 'lease';
    startedFrom?: 'direct_property' | 'broker_request_selection';
    submittedAt: string;
    expiresAt?: string;
    hoursRemaining: number;
    currentStep: FastTrackStep;
    documents: FastTrackDocuments;
    finalStatus: 'in_progress' | 'completed' | 'expired' | 'rejected';
    journeyType?: 'rent' | 'buy';
    journeySource?: 'direct_property' | 'broker_request_selection';
    journeyStage?: string;
    nextAction?: string;
    nextActionTarget?: string;
    statusReason?: string;
    blockingRequirements?: string[];
    pendingRequirements?: string[];
    completedRequirements?: string[];
    overrideReason?: string;
    overrideBy?: string;
    overrideAt?: string;
    jurisdiction?: string;
    compliancePack?: string;
    requiredComplianceItems?: string[];
    completedComplianceItems?: string[];
    blockedByCompliance?: boolean;
    complianceStatusReason?: string;
    // extra fields to preserve ID
    id: string;
}

const normalizeFastTrackStep = (step?: string): FastTrackStep => {
    switch (String(step || '').trim()) {
        case 'property_selected':
            return 'property_selected';
        case 'documents_verified':
            return 'documents_verified';
        case 'viewing_scheduled':
            return 'viewing_scheduled';
        case 'viewing_completed':
            return 'viewing_completed';
        case 'application_in_review':
            return 'application_in_review';
        case 'ready_for_contract':
            return 'ready_for_contract';
        case 'completed':
            return 'completed';
        case 'documents':
            return 'documents_requested';
        case 'owner_approval':
        case 'legal_check':
            return 'application_in_review';
        case 'payment_ready':
            return 'ready_for_contract';
        default:
            return 'documents_requested';
    }
};

const normalizeDocStatus = (value: unknown): DocStatus => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'verified' || normalized === 'approved') {
            return 'verified';
        }
    }

    return 'pending';
};

const normalizeDocuments = (documents: FastTrackDocuments | Record<string, unknown> | null | undefined): FastTrackDocuments => ({
    identityProof: normalizeDocStatus((documents as any)?.identityProof ?? (documents as any)?.idProof),
    addressProof: normalizeDocStatus((documents as any)?.addressProof ?? (documents as any)?.propertyDocs),
});

// Mapper function
const mapBackendToFrontend = (apiCase: BackendFastTrackCase): FastTrackCase => ({
    caseId: apiCase.id,
    id: apiCase.id,
    propertyId: apiCase.property_id,
    propertyCountry: apiCase.property_country,
    brokerRequestId: apiCase.broker_request_id,
    leadId: apiCase.lead_id,
    managerId: apiCase.manager_id,
    clientId: apiCase.client_id,
    propertyTitle: apiCase.property_title,
    propertyType: apiCase.property_type,
    listingType: apiCase.listing_type,
    startedFrom: apiCase.started_from,
    clientName: apiCase.client_name,
    submittedAt: apiCase.submitted_at,
    expiresAt: apiCase.expires_at,
    hoursRemaining: apiCase.hours_remaining,
    currentStep: normalizeFastTrackStep(apiCase.current_step),
    documents: normalizeDocuments(apiCase.documents),
    finalStatus: apiCase.final_status,
    journeyType: apiCase.journey_type,
    journeySource: apiCase.journey_source,
    journeyStage: apiCase.journey_stage,
    nextAction: apiCase.next_action,
    nextActionTarget: apiCase.next_action_target,
    statusReason: apiCase.status_reason,
    blockingRequirements: apiCase.blocking_requirements || [],
    pendingRequirements: apiCase.pending_requirements || [],
    completedRequirements: apiCase.completed_requirements || [],
    overrideReason: apiCase.override_reason,
    overrideBy: apiCase.override_by,
    overrideAt: apiCase.override_at,
    jurisdiction: apiCase.jurisdiction,
    compliancePack: apiCase.compliance_pack,
    requiredComplianceItems: apiCase.required_compliance_items || [],
    completedComplianceItems: apiCase.completed_compliance_items || [],
    blockedByCompliance: apiCase.blocked_by_compliance,
    complianceStatusReason: apiCase.compliance_status_reason,
});

export interface CreateFastTrackRequest {
    property_id: string;
    broker_request_id?: string;
    lead_id?: string;
    manager_id?: string;
    client_id: string;
    client_name: string;
    property_title: string;
    property_type: PropertyType;
    property_country?: string;
    listing_type?: 'rent' | 'sale' | 'lease';
    started_from?: 'direct_property' | 'broker_request_selection';
}

export interface UpdateFastTrackRequest {
    current_step?: string;
    final_status?: string;
    lead_id?: string;
    manager_id?: string;
    documents?: FastTrackDocuments;
    override_reason?: string;
}

export const getFastTrackCases = async (options: ServiceRequestOptions = {}) => {
    try {
        const result = await apiFetch<BackendFastTrackCase[]>(`${BOOKING_URL()}/api/v1/fast-track`, options);
        if (result) {
            return { data: result.map(mapBackendToFrontend), error: null };
        }
        return { data: [], error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
    }
};
