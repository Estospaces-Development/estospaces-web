/**
 * Manager Verification Service
 * Manages manager profiles, verification documents, and admin review workflows
 * via core-service backend endpoints.
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

// ── Type Definitions ────────────────────────────────────────────────────────

export type ManagerProfileType = 'broker' | 'company';

export type VerificationStatus =
    | 'incomplete'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'verification_required';

export type DocumentStatus =
    | 'pending'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'reupload_required';

export type ManagerDocumentType =
    | 'government_id'
    | 'broker_license'
    | 'company_registration'
    | 'business_license'
    | 'tax_certificate'
    | 'representative_id'
    | 'address_proof';

export interface ManagerProfile {
    id: string;
    profile_type: ManagerProfileType;
    company_name?: string;
    company_description?: string;
    license_number?: string;
    license_expiry_date?: string;
    association_membership_id?: string;
    company_registration_number?: string;
    tax_id?: string;
    company_address?: string;
    authorized_representative_name?: string;
    authorized_representative_email?: string;

    // UK Specific Membership Flags
    has_ombudsman: boolean;
    has_insurance: boolean;
    has_client_money: boolean;
    arla_member: boolean;
    naea_member: boolean;
    rics_member: boolean;

    verification_status: VerificationStatus;
    rejection_reason?: string;
    revision_notes?: string;
    submitted_at?: string;
    approved_at?: string;
    approved_by?: string;
    created_at: string;
    updated_at: string;
}

export interface ManagerDocument {
    id: string;
    manager_id: string;
    document_type: ManagerDocumentType;
    document_url: string;
    document_name?: string;
    document_number?: string;
    expiry_date?: string;
    verification_status: DocumentStatus;
    rejection_reason?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    submitted_at: string;
    updated_at: string;
    metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
    id: string;
    manager_id: string;
    action_type: string;
    actor_id: string;
    actor_role: string;
    notes?: string;
    created_at: string;
}

export interface ManagerVerificationSummary {
    profile: ManagerProfile | null;
    documents: ManagerDocument[];
    requiredDocuments: ManagerDocumentType[];
    isComplete: boolean;
    missingDocuments: ManagerDocumentType[];
}

export interface ManagerVerificationDetails {
    profile: ManagerProfile | null;
    documents: ManagerDocument[];
    auditLog: AuditLogEntry[];
    userInfo: { email?: string; full_name?: string } | null;
}

// ── Constants ───────────────────────────────────────────────────────────────

const REQUIRED_DOCUMENTS: Record<ManagerProfileType, ManagerDocumentType[]> = {
    broker: ['government_id', 'broker_license'],
    company: ['company_registration', 'business_license', 'tax_certificate', 'representative_id'],
};

export const getRequiredDocuments = (type: ManagerProfileType): ManagerDocumentType[] => {
    return REQUIRED_DOCUMENTS[type] || [];
};

export const getManagerDocumentTypeName = (type: ManagerDocumentType): string => {
    const names: Record<ManagerDocumentType, string> = {
        government_id: 'Government ID',
        broker_license: 'Broker License',
        company_registration: 'Company Registration',
        business_license: 'Business License',
        tax_certificate: 'Tax Certificate',
        representative_id: 'Representative ID',
        address_proof: 'Proof of Address',
    };
    return names[type] || type;
};

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Get the current manager's broker profile
 * GET /api/v1/brokers/profile (core-service)
 */
export const getManagerProfile = async (_userId: string): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    try {
        const data = await apiFetch<any>(`${CORE_URL()}/api/v1/brokers/profile`);
        // Map broker profile response to ManagerProfile shape
        const profile: ManagerProfile = {
            id: data.user_id || _userId,
            profile_type: 'broker',
            company_name: data.company_name,
            company_description: data.company_description,
            license_number: data.company_reg_number,
            verification_status: mapVerificationStatus(data.verification_status),
            company_registration_number: data.company_reg_number,
            company_address: data.business_phone,
            has_ombudsman: data.has_ombudsman || false,
            has_insurance: data.has_insurance || false,
            has_client_money: data.has_client_money || false,
            arla_member: data.arla_member || false,
            naea_member: data.naea_member || false,
            rics_member: data.rics_member || false,
            created_at: data.created_at,
            updated_at: data.updated_at,
        };
        return { data: profile, error: null };
    } catch (error: any) {
        console.error('[managerVerificationService] getManagerProfile error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Get the manager's documents
 * GET /api/v1/documents (core-service)
 */
const getManagerDocuments = async (): Promise<ManagerDocument[]> => {
    try {
        const data = await apiFetch<any[]>(`${CORE_URL()}/api/v1/documents`);
        return (data || []).map((doc: any) => ({
            id: doc.id,
            manager_id: doc.user_id,
            document_type: doc.document_category || doc.document_type,
            document_url: doc.file_url,
            document_name: doc.file_name,
            document_number: doc.document_number,
            expiry_date: doc.expiry_date,
            verification_status: doc.status as DocumentStatus,
            rejection_reason: doc.reject_reason,
            reviewed_by: doc.reviewed_by,
            reviewed_at: doc.reviewed_at,
            submitted_at: doc.created_at,
            updated_at: doc.updated_at,
        }));
    } catch {
        return [];
    }
};

/**
 * Get full verification summary (profile + docs + completeness check)
 */
export const getManagerVerificationSummary = async (userId: string): Promise<{ data: ManagerVerificationSummary | null; error: string | null }> => {
    try {
        const [profileRes, documents] = await Promise.all([
            getManagerProfile(userId),
            getManagerDocuments(),
        ]);

        const profile = profileRes.data;
        const profileType = profile?.profile_type || 'broker';
        const required = getRequiredDocuments(profileType);
        const uploadedTypes = documents.map(d => d.document_type);
        const missing = required.filter(r => !uploadedTypes.includes(r));

        return {
            data: {
                profile,
                documents,
                requiredDocuments: required,
                isComplete: missing.length === 0,
                missingDocuments: missing,
            },
            error: null,
        };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

/**
 * Register or update a broker profile
 * POST /api/v1/brokers/register (core-service)
 */
export const createOrUpdateManagerProfile = async (_userId: string, data: Partial<ManagerProfile>): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(
            `${CORE_URL()}/api/v1/brokers/register`,
            {
                method: 'POST',
                body: JSON.stringify({
                    company_name: data.company_name || '',
                    company_description: data.company_description || '',
                    company_reg_number: data.company_registration_number || data.license_number || '',
                    business_phone: data.company_address || '',
                    service_areas: '[]',
                    has_ombudsman: data.has_ombudsman || false,
                    has_insurance: data.has_insurance || false,
                    has_client_money: data.has_client_money || false,
                    arla_member: data.arla_member || false,
                    naea_member: data.naea_member || false,
                    rics_member: data.rics_member || false,
                }),
            },
        );
        return { data: result as ManagerProfile, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

/**
 * Upload a manager document
 * POST /api/v1/documents (core-service)
 */
export const uploadManagerDocument = async (
    _file: File,
    managerId: string,
    documentType: ManagerDocumentType,
): Promise<{ url: string | null; path: string | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(
            `${CORE_URL()}/api/v1/documents`,
            {
                method: 'POST',
                body: JSON.stringify({
                    document_type: documentType,
                    document_category: documentType,
                    file_name: _file.name,
                    file_url: `/uploads/${managerId}/${_file.name}`,
                    file_size: _file.size,
                    mime_type: _file.type,
                }),
            },
        );
        return { url: result.file_url, path: result.storage_path || null, error: null };
    } catch (error: any) {
        return { url: null, path: null, error: error.message };
    }
};

/**
 * Submit a document record
 * POST /api/v1/documents (core-service)
 */
export const submitManagerDocument = async (data: any): Promise<{ data: ManagerDocument | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(
            `${CORE_URL()}/api/v1/documents`,
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
        );
        return { data: result as ManagerDocument, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

/**
 * Delete a manager document
 * First finds the document by type, then calls DELETE /api/v1/documents/:id
 */
export const deleteManagerDocument = async (_managerId: string, documentType: ManagerDocumentType): Promise<{ error: string | null }> => {
    try {
        // 1. Find the document ID for this type
        const docs = await getManagerDocuments();
        const doc = docs.find(d => d.document_type === documentType);

        if (!doc) {
            return { error: 'Document not found' };
        }

        // 2. Delete via backend endpoint
        await apiFetch<any>(
            `${CORE_URL()}/api/v1/documents/${doc.id}`,
            {
                method: 'DELETE',
            },
        );
        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

/**
 * Get full verification details (profile + docs + audit log)
 */
export const getManagerVerificationDetails = async (userId: string): Promise<{ data: ManagerVerificationDetails | null; error: string | null }> => {
    try {
        const [profileRes, documents] = await Promise.all([
            getManagerProfile(userId),
            getManagerDocuments(),
        ]);

        return {
            data: {
                profile: profileRes.data,
                documents,
                auditLog: [], // Audit log comes from leads/:id/audit, not broker-specific
                userInfo: null, // User info would come from GET /api/v1/users/:id
            },
            error: null,
        };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

// ── Admin Review Functions ──────────────────────────────────────────────────

/**
 * Start reviewing a manager's verification
 * PUT /api/v1/documents/:id/review with status=under_review
 */
export const startReview = async (managerId: string, _actorId: string): Promise<{ error: string | null }> => {
    try {
        // Get manager's pending documents and mark them as under review
        const docs = await getManagerDocuments();
        const pendingDocs = docs.filter(d => d.verification_status === 'pending');
        for (const doc of pendingDocs) {
            await apiFetch<any>(
                `${CORE_URL()}/api/v1/documents/${doc.id}/review`,
                {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'under_review' }),
                },
            );
        }
        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

/**
 * Approve a manager
 * PUT /api/v1/brokers/:id/verify with status=verified (core-service, admin)
 */
export const approveManager = async (managerId: string, _actorId: string, notes?: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch<any>(
            `${CORE_URL()}/api/v1/brokers/${managerId}/verify`,
            {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'verified',
                    admin_notes: notes || '',
                    fast_track_eligible: true,
                }),
            },
        );
        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

/**
 * Reject a manager
 * PUT /api/v1/brokers/:id/verify with status=rejected (core-service, admin)
 */
export const rejectManager = async (managerId: string, _actorId: string, reason: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch<any>(
            `${CORE_URL()}/api/v1/brokers/${managerId}/verify`,
            {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'rejected',
                    admin_notes: reason,
                }),
            },
        );
        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

/**
 * Revoke manager approval
 * PUT /api/v1/brokers/:id/verify with status=rejected (core-service, admin)
 */
export const revokeManagerApproval = async (managerId: string, _actorId: string, reason: string): Promise<{ data: boolean; error: string | null }> => {
    try {
        await apiFetch<any>(
            `${CORE_URL()}/api/v1/brokers/${managerId}/verify`,
            {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'rejected',
                    admin_notes: `Approval revoked: ${reason}`,
                }),
            },
        );
        return { data: true, error: null };
    } catch (error: any) {
        return { data: false, error: error.message };
    }
};

/**
 * Request document reupload
 * PUT /api/v1/documents/:id/review with status=rejected + reason
 */
export const requestDocumentReupload = async (
    _managerId: string,
    _actorId: string,
    documentType: ManagerDocumentType,
    reason: string,
): Promise<{ error: string | null }> => {
    try {
        // Find the document of this type and reject it with reason
        const docs = await getManagerDocuments();
        const doc = docs.find(d => d.document_type === documentType);
        if (!doc) return { error: 'Document not found' };

        await apiFetch<any>(
            `${CORE_URL()}/api/v1/documents/${doc.id}/review`,
            {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'rejected',
                    reject_reason: reason,
                }),
            },
        );
        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

/**
 * Submit manager profile for verification
 * This updates the broker's status by calling the profile update
 */
export const submitForVerification = async (managerId: string): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    try {
        // Trigger verification by updating profile status
        const result = await apiFetch<any>(
            `${CORE_URL()}/api/v1/brokers/${managerId}/verify`,
            {
                method: 'PUT',
                body: JSON.stringify({ status: 'basic' }),
            },
        );
        return { data: result as ManagerProfile, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapVerificationStatus(backendStatus: string | undefined): VerificationStatus {
    const mapping: Record<string, VerificationStatus> = {
        'none': 'incomplete',
        'basic': 'submitted',
        'verified': 'approved',
        'fully_verified': 'approved',
        'rejected': 'rejected',
    };
    return mapping[backendStatus || ''] || 'incomplete';
}
