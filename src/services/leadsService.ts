/**
 * Leads Service
 * Fetches lead data from core-service backend
 */

import { apiFetch, apiFetchEnvelope, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
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
    sla_remaining_seconds?: number;
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
        agent_company?: string;
        agent_email?: string;
        agent_phone?: string;
        listing_type?: string;
    };
    // UI-mapped fields
    name?: string;
    email?: string;
    phone?: string;
    property_name?: string;
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
        return { data: null, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
    }
};

/**
 * Create a broker request for agent matching
 * POST /api/v1/leads/broker-request (core-service)
 */
export const createBrokerRequest = async (requestData: {
    requestType: string;
    location: string;
    budget: string;
    details: string;
}): Promise<{ success: boolean; error: string | null }> => {
    try {
        await apiFetch<any>(
            `${CORE_URL()}/api/v1/leads/broker-request`,
            {
                method: 'POST',
                body: JSON.stringify({
                    request_type: requestData.requestType,
                    location: requestData.location,
                    budget: requestData.budget,
                    details: requestData.details,
                }),
            },
        );
        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
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
        return { success: false, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
    }
};

/**
 * Get all leads (admin)
 * GET /api/v1/leads (core-service, admin)
 */
export const getAllLeads = async (page: number = 1, limit: number = 20): Promise<{
    data: Lead[] | null;
    pagination?: { total?: number; page?: number; limit?: number } | null;
    error: string | null;
}> => {
    try {
        const response = await apiFetchEnvelope<Lead[]>(
            `${CORE_URL()}/api/v1/leads?page=${page}&limit=${limit}`,
        );
        return { data: response.data || [], pagination: response.pagination || null, error: null };
    } catch (error: any) {
        return { data: null, pagination: null, error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
    }
};

/**
 * Upload a document for verification
 * POST /api/v1/documents (core-service)
 */
export const uploadDocument = async (
    type: string,
    file: File,
    options: { leadId?: string } = {},
): Promise<{ success: boolean; data: UserDocument | null; error: string | null }> => {
    try {
        const mapping = DOCUMENT_UPLOAD_TYPES[type];
        if (!mapping) {
            throw new Error(`Document upload type "${type}" is not supported on develop`);
        }

        const uploadedFile = await uploadMediaFile(file, 'document', crypto.randomUUID(), file.name);

        const data = await apiFetch<UserDocument>(`${CORE_URL()}/api/v1/documents`, {
            method: 'POST',
            body: JSON.stringify({
                document_type: mapping.document_type,
                document_category: mapping.document_category,
                file_name: file.name,
                file_url: uploadedFile.file_url,
                file_size: file.size,
                mime_type: file.type,
                lead_id: options.leadId || '',
            }),
        });
        return { success: true, data, error: null };
    } catch (error: any) {
        return { success: false, data: null, error: getErrorMessage(error) };
    }
};

export const getUserDocuments = async (): Promise<{
    data: UserDocument[];
    verificationLevel: string | null;
    error: string | null;
}> => {
    try {
        const response = await apiFetch<{ documents?: UserDocument[]; verification_level?: string }>(
            `${CORE_URL()}/api/v1/documents`,
        );

        return {
            data: response.documents || [],
            verificationLevel: response.verification_level || null,
            error: null,
        };
    } catch (error: any) {
        return {
            data: [],
            verificationLevel: null,
            error: getErrorMessage(error),
        };
    }
};

/**
 * Resend email verification
 * POST /api/v1/auth/resend-verification (core-service)
 */
export const resendVerification = async (email: string): Promise<{ success: boolean; error: string | null }> => {
    try {
        await apiFetch<any>(`${CORE_URL()}/api/v1/auth/resend-verification`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: getErrorMessage(error) };
    }
};

export const leadsService = {
    getUserLeads,
    getBrokerLeads,
    getLeadById,
    updateLeadStatus,
    createLead,
    createBrokerRequest,
    createManualLead,
    updateLead,
    deleteLead,
    respondToLead,
    getLeadAudit,
    getAllLeads,
    reassignLead,
    uploadDocument,
    getUserDocuments,
    resendVerification,
};
