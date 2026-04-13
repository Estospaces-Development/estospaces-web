/**
 * Leads Service
 * Fetches lead data from core-service backend
 */

import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import { uploadMediaFile } from '@/services/mediaService';

const CORE_URL = () => getServiceUrl('core');

export interface Lead {
    id: string;
    lead_number?: string;
    property_id?: string;
    user_id?: string;
    broker_id?: string;
    status: string;
    sla_start_time?: string;
    sla_deadline?: string;
    sla_status?: string;
    sla_duration_seconds?: number;
    first_response_at?: string;
    response_time_seconds?: number;
    response_type?: string;
    user_verification_level?: string;
    documents_uploaded?: boolean;
    documents_verified?: boolean;
    viewing_scheduled?: boolean;
    viewing_scheduled_at?: string;
    viewing_completed_at?: string;
    application_submitted_at?: string;
    outcome?: string;
    closed_at?: string;
    notes?: string;
    reassigned_from?: string;
    reassign_count?: number;
    property?: {
        id: string;
        title: string;
        address_line_1: string;
        city: string;
        price: number;
        image_urls: string;
        property_type: string;
        agent_name: string;
    };
    // UI-mapped fields
    name?: string;
    email?: string;
    phone?: string;
    propertyInterested?: string;
    score?: number;
    budget?: string;
    lastContact?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateManualLeadRequest {
    name: string;
    email: string;
    phone?: string;
    property_interested: string;
    status?: string;
    score?: number;
    budget?: string;
    last_contact?: string;
}

export interface UpdateLeadRequest {
    name?: string;
    email?: string;
    phone?: string;
    property_interested?: string;
    status?: string;
    score?: number;
    budget?: string;
    last_contact?: string;
}

export interface UserDocument {
    id: string;
    user_id: string;
    document_type: string;
    document_category: string;
    file_name: string;
    file_url: string;
    file_size: number;
    mime_type: string;
    status: string;
    reject_reason?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    lead_id?: string | null;
    created_at: string;
    updated_at: string;
}

const DOCUMENT_UPLOAD_TYPES: Record<string, { document_type: string; document_category: string }> = {
    identity: {
        document_type: 'government_id',
        document_category: 'identity',
    },
    address: {
        document_type: 'address_proof',
        document_category: 'address',
    },
};

export interface DocumentUploadOptions {
    targetUserId?: string;
    leadId?: string;
    fastTrackCaseId?: string;
    applicationId?: string;
    contractId?: string;
    propertyId?: string;
    managerId?: string;
    requestId?: string;
    linkFamily?: string;
    visibility?: string;
    requirementCodes?: string[];
    reusable?: boolean;
    documentType?: string;
    documentCategory?: string;
}

/**
 * Fetch leads for the logged-in user
 * GET /api/v1/leads/mine (core-service)
 */
export const getUserLeads = async (): Promise<{ data: Lead[] | null; error: string | null }> => {
    try {
        const data = await apiFetch<Lead[]>(
            `${CORE_URL()}/api/v1/leads/mine`,
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[leadsService] getUserLeads error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Fetch leads for the logged-in broker
 * GET /api/v1/leads/broker (core-service)
 */
export const getBrokerLeads = async (status?: string): Promise<{ data: Lead[] | null; error: string | null }> => {
    try {
        const url = new URL(`${CORE_URL()}/api/v1/leads/broker`);
        if (status) url.searchParams.append('status', status);

        const data = await apiFetch<Lead[]>(url.toString());
        return { data, error: null };
    } catch (error: any) {
        console.error('[leadsService] getBrokerLeads error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Fetch a single lead by ID
 * GET /api/v1/leads/:id (core-service)
 */
export const getLeadById = async (leadId: string): Promise<{ data: Lead | null; error: string | null }> => {
    try {
        const data = await apiFetch<Lead>(
            `${CORE_URL()}/api/v1/leads/${leadId}`,
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[leadsService] getLeadById error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Update lead status
 * PUT /api/v1/leads/:id/status (core-service)
 */
export const updateLeadStatus = async (leadId: string, status: string): Promise<{ data: any; error: string | null }> => {
    try {
        const data = await apiFetch<any>(
            `${CORE_URL()}/api/v1/leads/${leadId}/status`,
            {
                method: 'PUT',
                body: JSON.stringify({ status }),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[leadsService] updateLeadStatus error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Create a new lead (fast-track)
 * POST /api/v1/leads (core-service)
 */
export const createLead = async (propertyId: string): Promise<{ data: Lead | null; error: string | null }> => {
    try {
        const data = await apiFetch<Lead>(
            `${CORE_URL()}/api/v1/leads`,
            {
                method: 'POST',
                body: JSON.stringify({ property_id: propertyId }),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[leadsService] createLead error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Create a NEW MANUAL lead (broker)
 * POST /api/v1/leads/manual (core-service)
 */
export const createManualLead = async (leadData: CreateManualLeadRequest): Promise<{ data: Lead | null; error: string | null }> => {
    try {
        const data = await apiFetch<Lead>(
            `${CORE_URL()}/api/v1/leads/manual`,
            {
                method: 'POST',
                body: JSON.stringify(leadData),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[leadsService] createManualLead error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Update lead details
 * PUT /api/v1/leads/:id (core-service)
 */
export const updateLead = async (leadId: string, leadData: UpdateLeadRequest): Promise<{ data: Lead | null; error: string | null }> => {
    try {
        const data = await apiFetch<Lead>(
            `${CORE_URL()}/api/v1/leads/${leadId}`,
            {
                method: 'PUT',
                body: JSON.stringify(leadData),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[leadsService] updateLead error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Delete lead (soft delete)
 * DELETE /api/v1/leads/:id (core-service)
 */
export const deleteLead = async (leadId: string): Promise<{ success: boolean; error: string | null }> => {
    try {
        await apiFetch<any>(
            `${CORE_URL()}/api/v1/leads/${leadId}`,
            {
                method: 'DELETE',
            },
        );
        return { success: true, error: null };
    } catch (error: any) {
        console.error('[leadsService] deleteLead error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Respond to a lead (broker action)
 * POST /api/v1/leads/:id/respond (core-service)
 */
export const respondToLead = async (
    leadId: string,
    responseType: 'call' | 'message' | 'schedule_viewing' | 'request_docs',
    message?: string,
    viewingDate?: string,
): Promise<{ data: any; error: string | null }> => {
    try {
        const data = await apiFetch<any>(
            `${CORE_URL()}/api/v1/leads/${leadId}/respond`,
            {
                method: 'POST',
                body: JSON.stringify({
                    response_type: responseType,
                    message,
                    viewing_date: viewingDate,
                }),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[leadsService] respondToLead error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Get lead audit trail
 * GET /api/v1/leads/:id/audit (core-service)
 */
export const getLeadAudit = async (leadId: string): Promise<{ data: any[] | null; error: string | null }> => {
    try {
        const data = await apiFetch<any[]>(
            `${CORE_URL()}/api/v1/leads/${leadId}/audit`,
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

/**
 * Get all leads (admin)
 * GET /api/v1/leads (core-service, admin)
 */
export const getAllLeads = async (page: number = 1, limit: number = 20): Promise<{ data: Lead[] | null; error: string | null }> => {
    try {
        const data = await apiFetch<Lead[]>(
            `${CORE_URL()}/api/v1/leads?page=${page}&limit=${limit}`,
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

/**
 * Reassign a lead to another broker (admin)
 * PUT /api/v1/leads/:id/reassign (core-service, admin)
 */
export const reassignLead = async (leadId: string, newBrokerId: string): Promise<{ data: any; error: string | null }> => {
    try {
        const data = await apiFetch<any>(
            `${CORE_URL()}/api/v1/leads/${leadId}/reassign`,
            {
                method: 'PUT',
                body: JSON.stringify({ broker_id: newBrokerId }),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

export const uploadDocument = async (
    type: string,
    file: File,
    options: DocumentUploadOptions = {},
): Promise<{
    success: boolean;
    data: UserDocument | null;
    error: string | null;
}> => {
    try {
        const mapping = DOCUMENT_UPLOAD_TYPES[type];
        const resolvedDocumentType = options.documentType || mapping?.document_type;
        const resolvedDocumentCategory = options.documentCategory || mapping?.document_category;
        if (!resolvedDocumentType || !resolvedDocumentCategory) {
            throw new Error(`Document upload type "${type}" is not supported`);
        }

        const uploadedFile = await uploadMediaFile(
            file,
            'document',
            crypto.randomUUID(),
            file.name,
            false,
        );

        const data = await apiFetch<UserDocument>(
            `${CORE_URL()}/api/v1/documents`,
            {
                method: 'POST',
                body: JSON.stringify({
                    document_type: resolvedDocumentType,
                    document_category: resolvedDocumentCategory,
                    media_id: uploadedFile.id,
                    file_name: file.name,
                    file_url: uploadedFile.file_url,
                    file_size: file.size,
                    mime_type: file.type,
                    target_user_id: options.targetUserId || '',
                    lead_id: options.leadId || '',
                    fast_track_case_id: options.fastTrackCaseId || '',
                    application_id: options.applicationId || '',
                    contract_id: options.contractId || '',
                    property_id: options.propertyId || '',
                    manager_id: options.managerId || '',
                    request_id: options.requestId || '',
                    link_family: options.linkFamily || '',
                    visibility: options.visibility || '',
                    requirement_codes: options.requirementCodes || [],
                    reusable: options.reusable ?? false,
                }),
            },
        );
        return { success: true, data, error: null };
    } catch (error: any) {
        return { success: false, data: null, error: getErrorMessage(error) };
    }
};
