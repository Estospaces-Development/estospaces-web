/**
 * Manager Verification Service
 * Handles broker verification data via the core-service backend.
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

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

const REQUIRED_DOCUMENTS: Record<ManagerProfileType, ManagerDocumentType[]> = {
    broker: ['government_id', 'broker_license'],
    company: ['company_registration', 'business_license', 'tax_certificate', 'representative_id'],
};

const DOCUMENT_TYPE_NAMES: Record<ManagerDocumentType, string> = {
    government_id: 'Government ID',
    broker_license: 'Broker License',
    company_registration: 'Company Registration',
    business_license: 'Business License',
    tax_certificate: 'Tax Certificate',
    representative_id: 'Representative ID',
    address_proof: 'Proof of Address',
};

export const getRequiredDocuments = (type: ManagerProfileType): ManagerDocumentType[] => {
    return REQUIRED_DOCUMENTS[type] || [];
};

export const getManagerDocumentTypeName = (type: ManagerDocumentType): string => {
    return DOCUMENT_TYPE_NAMES[type] || type;
};

const normalizeProfileType = (value?: string): ManagerProfileType => {
    return value === 'company' ? 'company' : 'broker';
};

const mapVerificationStatus = (backendStatus?: string): VerificationStatus => {
    const mapping: Record<string, VerificationStatus> = {
        none: 'incomplete',
        pending: 'submitted',
        basic: 'submitted',
        documents_submitted: 'submitted',
        under_review: 'under_review',
        verified: 'approved',
        fully_verified: 'approved',
        rejected: 'rejected',
        verification_required: 'verification_required',
    };

    return mapping[backendStatus || ''] || 'incomplete';
};

const mapDocumentStatus = (status?: string): DocumentStatus => {
    const mapping: Record<string, DocumentStatus> = {
        pending: 'pending',
        under_review: 'under_review',
        approved: 'approved',
        rejected: 'rejected',
        reupload_required: 'reupload_required',
    };

    return mapping[status || ''] || 'pending';
};

const mapDocumentType = (document: any): ManagerDocumentType => {
    const rawType = String(document.document_type || document.document_category || '').trim();
    const mapping: Record<string, ManagerDocumentType> = {
        identity: 'government_id',
        government_id: 'government_id',
        broker_license: 'broker_license',
        company_registration: 'company_registration',
        business_license: 'business_license',
        financial: 'tax_certificate',
        tax_certificate: 'tax_certificate',
        representative_id: 'representative_id',
        address: 'address_proof',
        address_proof: 'address_proof',
    };

    return mapping[rawType] || (rawType as ManagerDocumentType) || 'government_id';
};

const mapDocumentCategory = (documentType: ManagerDocumentType): string => {
    const mapping: Record<ManagerDocumentType, string> = {
        government_id: 'identity',
        broker_license: 'broker_license',
        company_registration: 'company_registration',
        business_license: 'business_license',
        tax_certificate: 'financial',
        representative_id: 'identity',
        address_proof: 'address',
    };

    return mapping[documentType];
};

const mapUserFullName = (user: any): string | undefined => {
    const fullName = String(user?.full_name || '').trim();
    if (fullName) return fullName;

    const combined = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    return combined || undefined;
};

const mapManagerProfile = (data: any, userInfo?: any): ManagerProfile => {
    return {
        id: data.user_id || data.id || '',
        profile_type: normalizeProfileType(data.profile_type),
        company_name: data.company_name || undefined,
        company_description: data.company_description || undefined,
        license_number: data.company_reg_number || data.license_number || undefined,
        license_expiry_date: data.license_expiry_date || undefined,
        association_membership_id: data.association_membership_id || undefined,
        company_registration_number: data.company_reg_number || data.company_registration_number || undefined,
        tax_id: data.tax_id || undefined,
        company_address: data.business_phone || data.company_address || undefined,
        authorized_representative_name: mapUserFullName(userInfo) || data.authorized_representative_name || undefined,
        authorized_representative_email: userInfo?.email || data.authorized_representative_email || undefined,
        has_ombudsman: Boolean(data.has_ombudsman),
        has_insurance: Boolean(data.has_insurance),
        has_client_money: Boolean(data.has_client_money),
        arla_member: Boolean(data.arla_member),
        naea_member: Boolean(data.naea_member),
        rics_member: Boolean(data.rics_member),
        verification_status: mapVerificationStatus(data.verification_status),
        rejection_reason: data.verification_status === 'rejected' ? data.admin_notes || undefined : undefined,
        revision_notes: data.admin_notes || undefined,
        submitted_at: data.created_at || undefined,
        approved_at: data.verified_at || undefined,
        approved_by: data.verified_by || undefined,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || data.created_at || new Date().toISOString(),
    };
};

const mapManagerDocument = (document: any): ManagerDocument => {
    return {
        id: document.id,
        manager_id: document.user_id || document.manager_id,
        document_type: mapDocumentType(document),
        document_url: document.file_url || document.document_url || '',
        document_name: document.file_name || document.document_name || undefined,
        document_number: document.document_number || undefined,
        expiry_date: document.expiry_date || undefined,
        verification_status: mapDocumentStatus(document.status || document.verification_status),
        rejection_reason: document.reject_reason || document.rejection_reason || undefined,
        reviewed_by: document.reviewed_by || undefined,
        reviewed_at: document.reviewed_at || undefined,
        submitted_at: document.created_at || document.submitted_at || new Date().toISOString(),
        updated_at: document.updated_at || document.created_at || new Date().toISOString(),
        metadata: document.metadata || undefined,
    };
};

const getCurrentManagerDocuments = async (): Promise<ManagerDocument[]> => {
    try {
        const data = await apiFetch<any>(`${CORE_URL()}/api/v1/documents`);
        const documents = Array.isArray(data)
            ? data
            : Array.isArray(data?.documents)
                ? data.documents
                : [];

        return documents.map(mapManagerDocument);
    } catch {
        return [];
    }
};

const getUserInfo = async (userId: string): Promise<any | null> => {
    try {
        return await apiFetch<any>(`${CORE_URL()}/api/v1/users/${userId}`);
    } catch {
        return null;
    }
};

export const getManagerProfile = async (userId: string): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    try {
        const data = await apiFetch<any>(`${CORE_URL()}/api/v1/brokers/profile`);
        return { data: mapManagerProfile(data, { id: userId }), error: null };
    } catch (error: any) {
        console.error('[managerVerificationService] getManagerProfile error:', error.message);
        return { data: null, error: error.message };
    }
};

export const getManagers = async (status?: string, page = 1, limit = 20): Promise<{ data: ManagerProfile[]; total: number; error: string | null }> => {
    try {
        const query = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status && status !== 'all') {
            query.append('status', status);
        }

        const brokers = await apiFetch<any[]>(`${CORE_URL()}/api/v1/brokers?${query.toString()}`);
        const userInfoEntries = await Promise.all(
            brokers.map(async (broker) => [broker.user_id, await getUserInfo(broker.user_id)] as const),
        );
        const userInfoById = new Map(userInfoEntries);

        const profiles = brokers.map((broker) => mapManagerProfile(broker, userInfoById.get(broker.user_id)));
        return { data: profiles, total: profiles.length, error: null };
    } catch (error: any) {
        console.error('[managerVerificationService] getManagers error:', error.message);
        return { data: [], total: 0, error: error.message };
    }
};

export const getManagerVerificationSummary = async (userId: string): Promise<{ data: ManagerVerificationSummary | null; error: string | null }> => {
    try {
        const [profileRes, documents] = await Promise.all([
            getManagerProfile(userId),
            getCurrentManagerDocuments(),
        ]);

        const profile = profileRes.data;
        const required = getRequiredDocuments(profile?.profile_type || 'broker');
        const uploadedTypes = documents.map((document) => document.document_type);
        const missingDocuments = required.filter((documentType) => !uploadedTypes.includes(documentType));

        return {
            data: {
                profile,
                documents,
                requiredDocuments: required,
                isComplete: profile !== null && missingDocuments.length === 0,
                missingDocuments,
            },
            error: null,
        };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

export const createOrUpdateManagerProfile = async (_userId: string, data: Partial<ManagerProfile>): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(`${CORE_URL()}/api/v1/brokers/register`, {
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
        });

        return { data: mapManagerProfile(result), error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

export const uploadManagerDocument = async (
    file: File,
    managerId: string,
    documentType: ManagerDocumentType,
): Promise<{ url: string | null; path: string | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(`${CORE_URL()}/api/v1/documents`, {
            method: 'POST',
            body: JSON.stringify({
                document_type: documentType,
                document_category: mapDocumentCategory(documentType),
                file_name: file.name,
                file_url: `/uploads/${managerId}/${file.name}`,
                file_size: file.size,
                mime_type: file.type,
            }),
        });

        return { url: result.file_url || null, path: result.file_url || null, error: null };
    } catch (error: any) {
        return { url: null, path: null, error: error.message };
    }
};

export const submitManagerDocument = async (data: any): Promise<{ data: ManagerDocument | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(`${CORE_URL()}/api/v1/documents`, {
            method: 'POST',
            body: JSON.stringify(data),
        });

        return { data: mapManagerDocument(result), error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

export const deleteManagerDocument = async (_managerId: string, documentType: ManagerDocumentType): Promise<{ error: string | null }> => {
    try {
        const documents = await getCurrentManagerDocuments();
        const document = documents.find((entry) => entry.document_type === documentType);
        if (!document) {
            return { error: 'Document not found' };
        }

        await apiFetch(`${CORE_URL()}/api/v1/documents/${document.id}`, {
            method: 'DELETE',
        });

        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

export const getManagerVerificationDetails = async (userId: string): Promise<{ data: ManagerVerificationDetails | null; error: string | null }> => {
    try {
        const data = await apiFetch<any>(`${CORE_URL()}/api/v1/brokers/${userId}`);
        const profile = data?.profile ? mapManagerProfile(data.profile, data.user_info) : null;
        const documents = Array.isArray(data?.documents) ? data.documents.map(mapManagerDocument) : [];
        const auditLog = Array.isArray(data?.audit_log)
            ? data.audit_log.map((entry: any) => ({
                id: entry.id,
                manager_id: userId,
                action_type: entry.action_type,
                actor_id: entry.actor_id || '',
                actor_role: entry.actor_role || '',
                notes: entry.notes || undefined,
                created_at: entry.created_at,
            }))
            : [];
        const userInfo = data?.user_info
            ? {
                email: data.user_info.email,
                full_name: mapUserFullName(data.user_info),
            }
            : null;

        return {
            data: {
                profile,
                documents,
                auditLog,
                userInfo,
            },
            error: null,
        };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};

export const startReview = async (managerId: string, _actorId: string): Promise<{ error: string | null }> => {
    try {
        const details = await getManagerVerificationDetails(managerId);
        const pendingDocuments = details.data?.documents.filter((document) => document.verification_status === 'pending') || [];

        await Promise.all(
            pendingDocuments.map((document) => apiFetch(`${CORE_URL()}/api/v1/documents/${document.id}/review`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'under_review' }),
            })),
        );

        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

export const approveManager = async (managerId: string, _actorId: string, notes?: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/brokers/${managerId}/verify`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'verified',
                admin_notes: notes || '',
                fast_track_eligible: true,
            }),
        });

        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

export const rejectManager = async (managerId: string, _actorId: string, reason: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/brokers/${managerId}/verify`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'rejected',
                admin_notes: reason,
                fast_track_eligible: false,
            }),
        });

        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

export const revokeManagerApproval = async (managerId: string, _actorId: string, reason: string): Promise<{ data: boolean; error: string | null }> => {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/brokers/${managerId}/verify`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'rejected',
                admin_notes: `Approval revoked: ${reason}`,
                fast_track_eligible: false,
            }),
        });

        return { data: true, error: null };
    } catch (error: any) {
        return { data: false, error: error.message };
    }
};

export const requestDocumentReupload = async (
    _managerId: string,
    _actorId: string,
    documentId: string,
    reason: string,
): Promise<{ error: string | null }> => {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/documents/${documentId}/review`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'reupload_required',
                reject_reason: reason,
            }),
        });

        return { error: null };
    } catch (error: any) {
        return { error: error.message };
    }
};

export const submitForVerification = async (managerId: string): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(`${CORE_URL()}/api/v1/brokers/${managerId}/verify`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'basic' }),
        });

        return { data: mapManagerProfile(result), error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
};
