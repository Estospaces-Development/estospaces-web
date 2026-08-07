/**
 * Manager Verification Service
 * Handles broker verification data via the core-service backend.
 */

import { apiFetch, apiFetchEnvelope, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import { uploadMediaFile } from '@/services/mediaService';

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
    branch_name?: string;
    company_description?: string;
    business_phone?: string;
    license_number?: string;
    license_expiry_date?: string;
    association_membership_id?: string;
    company_registration_number?: string;
    tax_id?: string;
    company_address?: string;
    registered_office_address?: string;
    complaints_contact?: string;
    redress_scheme_name?: string;
    redress_membership_number?: string;
    cmp_provider?: string;
    cmp_certificate_url?: string;
    authorized_representative_name?: string;
    authorized_representative_email?: string;
    service_areas?: string[];
    dispatch_pincodes?: string[];
    has_ombudsman: boolean;
    has_insurance: boolean;
    has_client_money: boolean;
    arla_member: boolean;
    naea_member: boolean;
    rics_member: boolean;
    verification_status: VerificationStatus;
    agency_verification_status?: VerificationStatus;
    agency_verification_reason?: string;
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
    mime_type?: string;
    file_name?: string;
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

const PLACEHOLDER_MANAGER_COMPANY_NAMES = new Set([
    'pending broker profile',
    'pending company profile',
    'pending profile',
]);

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

export const isPlaceholderManagerCompanyName = (value?: string): boolean => {
    return PLACEHOLDER_MANAGER_COMPANY_NAMES.has(String(value || '').trim().toLowerCase());
};

const hasText = (value?: string | null): boolean => String(value || '').trim().length > 0;

const getLatestManagerDocumentsByType = (documents: ManagerDocument[]): Map<ManagerDocumentType, ManagerDocument> => {
    const latestDocuments = [...documents].sort((left, right) => (
        new Date(right.submitted_at || right.updated_at).getTime() - new Date(left.submitted_at || left.updated_at).getTime()
    ));

    return latestDocuments.reduce((latestByType, document) => {
        if (!latestByType.has(document.document_type)) {
            latestByType.set(document.document_type, document);
        }

        return latestByType;
    }, new Map<ManagerDocumentType, ManagerDocument>());
};

export const getManagerApprovalBlocker = (
    profile: ManagerProfile | null,
    documents: ManagerDocument[],
): string | null => {
    if (!profile) {
        return 'Load the manager profile before approving this manager.';
    }

    const missingFields: string[] = [];
    if (!hasText(profile.company_name) || isPlaceholderManagerCompanyName(profile.company_name)) {
        missingFields.push('company name');
    }
    if (!hasText(profile.business_phone)) {
        missingFields.push('business phone');
    }
    if (!hasText(profile.company_address)) {
        missingFields.push('company address');
    }

    const registrationNumber = profile.company_registration_number || profile.license_number;
    if (!hasText(registrationNumber)) {
        missingFields.push(profile.profile_type === 'company' ? 'company registration number' : 'broker license number');
    }
    if (!hasText(profile.branch_name)) {
        missingFields.push('branch name');
    }
    if (!hasText(profile.registered_office_address)) {
        missingFields.push('registered office address');
    }
    if (!hasText(profile.complaints_contact)) {
        missingFields.push('complaints contact');
    }
    if (!hasText(profile.redress_scheme_name)) {
        missingFields.push('redress scheme name');
    }
    if (!hasText(profile.redress_membership_number)) {
        missingFields.push('redress membership number');
    }
    if (profile.has_client_money && !hasText(profile.cmp_provider)) {
        missingFields.push('client money protection provider');
    }
    if (profile.has_client_money && !hasText(profile.cmp_certificate_url)) {
        missingFields.push('client money protection certificate');
    }

    if (missingFields.length > 0) {
        return `Complete ${missingFields.join(', ')} before approving this manager.`;
    }

    const latestDocumentsByType = getLatestManagerDocumentsByType(documents);
    const requiredDocuments = getRequiredDocuments(profile.profile_type);
    const missingDocuments = requiredDocuments.filter((documentType) => !latestDocumentsByType.has(documentType));
    if (missingDocuments.length > 0) {
        return `Upload required verification documents before approving this manager: ${missingDocuments.map(getManagerDocumentTypeName).join(', ')}.`;
    }

    const blockedDocuments = requiredDocuments.filter((documentType) => {
        const document = latestDocumentsByType.get(documentType);
        return document?.verification_status === 'rejected' || document?.verification_status === 'reupload_required';
    });
    if (blockedDocuments.length > 0) {
        return `Replace rejected verification documents before approving this manager: ${blockedDocuments.map(getManagerDocumentTypeName).join(', ')}.`;
    }

    return null;
};

export const getManagerDisplayName = (
    profile: Pick<ManagerProfile, 'company_name' | 'authorized_representative_name'>,
): string => {
    const companyName = String(profile.company_name || '').trim();
    if (companyName && !isPlaceholderManagerCompanyName(companyName)) {
        return companyName;
    }

    const representativeName = String(profile.authorized_representative_name || '').trim();
    if (representativeName) {
        return representativeName;
    }

    return companyName || 'Unnamed manager';
};

const normalizeProfileType = (value?: string): ManagerProfileType => {
    return value === 'company' ? 'company' : 'broker';
};

export const normalizeManagerServiceAreas = (value?: string[] | string | null): string[] => {
    const rawValues = Array.isArray(value)
        ? value
        : (() => {
            const raw = String(value || '').trim();
            if (!raw || raw === '[]') return [];

            if (raw.startsWith('[')) {
                try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return raw.replace(/^\[/, '').replace(/\]$/, '').split(',');
                }
            }

            return raw.split(/[\n,]+/);
        })();

    const seen = new Set<string>();
    return rawValues.reduce<string[]>((areas, area) => {
        const normalized = String(area || '')
            .trim()
            .replace(/^["']|["']$/g, '')
            .replace(/\s+/g, ' ')
            .toUpperCase();
        if (!normalized || seen.has(normalized)) return areas;
        seen.add(normalized);
        areas.push(normalized);
        return areas;
    }, []);
};

const isProfileNotFoundError = (error: string | null | undefined): boolean => {
    const normalized = String(error || '').toLowerCase();
    return normalized.includes('broker profile not found');
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
        approved: 'approved',
        rejected: 'rejected',
        verification_required: 'verification_required',
        incomplete: 'incomplete',
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
    const backendVerificationStatus = String(data.verification_status || '').trim();
    const submittedStatuses = new Set(['pending', 'submitted', 'documents_submitted', 'under_review']);

    return {
        id: data.user_id || data.id || '',
        profile_type: normalizeProfileType(data.profile_type),
        company_name: isPlaceholderManagerCompanyName(data.company_name) ? undefined : (data.company_name || undefined),
        branch_name: data.branch_name || undefined,
        company_description: data.company_description || undefined,
        business_phone: data.business_phone || undefined,
        license_number: data.company_reg_number || data.license_number || undefined,
        license_expiry_date: data.license_expiry_date || undefined,
        association_membership_id: data.association_membership_id || undefined,
        company_registration_number: data.company_reg_number || data.company_registration_number || undefined,
        tax_id: data.tax_id || undefined,
        company_address: data.company_address || undefined,
        registered_office_address: data.registered_office_address || undefined,
        service_areas: normalizeManagerServiceAreas(data.service_areas),
        dispatch_pincodes: Array.isArray(data.dispatch_pincodes) ? data.dispatch_pincodes : [],
        complaints_contact: data.complaints_contact || undefined,
        redress_scheme_name: data.redress_scheme_name || undefined,
        redress_membership_number: data.redress_membership_number || undefined,
        cmp_provider: data.cmp_provider || undefined,
        cmp_certificate_url: data.cmp_certificate_url || undefined,
        authorized_representative_name: mapUserFullName(userInfo) || data.authorized_representative_name || undefined,
        authorized_representative_email: userInfo?.email || data.authorized_representative_email || undefined,
        has_ombudsman: Boolean(data.has_ombudsman),
        has_insurance: Boolean(data.has_insurance),
        has_client_money: Boolean(data.has_client_money),
        arla_member: Boolean(data.arla_member),
        naea_member: Boolean(data.naea_member),
        rics_member: Boolean(data.rics_member),
        verification_status: mapVerificationStatus(data.verification_status),
        agency_verification_status: mapVerificationStatus(data.agency_verification_status),
        agency_verification_reason: data.agency_verification_reason || undefined,
        rejection_reason: data.verification_status === 'rejected' ? data.admin_notes || undefined : undefined,
        revision_notes: data.admin_notes || undefined,
        submitted_at: data.submitted_at || (submittedStatuses.has(backendVerificationStatus) ? data.updated_at : data.created_at) || undefined,
        approved_at: data.verified_at || undefined,
        approved_by: data.verified_by || undefined,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || data.created_at || new Date().toISOString(),
    };
};

const fetchManagersPage = async (status: string | undefined, page: number, limit: number) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status && status !== 'all') {
        query.append('status', status);
    }

    return apiFetchEnvelope<any[]>(`${CORE_URL()}/api/v1/brokers?${query.toString()}`);
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
        submitted_at: document.submitted_at || document.created_at || new Date().toISOString(),
        updated_at: document.updated_at || document.created_at || new Date().toISOString(),
        mime_type: document.mime_type || undefined,
        file_name: document.file_name || document.document_name || undefined,
        metadata: document.metadata || undefined,
    };
};

const getCurrentManagerDocuments = async (): Promise<ManagerDocument[]> => {
    try {
        const data = await apiFetch<any>(`${CORE_URL()}/api/v1/documents`, {
            suppressErrorToast: true,
        });
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
        return await apiFetch<any>(`${CORE_URL()}/api/v1/users/${userId}`, {
            suppressErrorToast: true,
        });
    } catch {
        return null;
    }
};

export const getManagerProfile = async (userId: string): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    try {
        const data = await apiFetch<any>(`${CORE_URL()}/api/v1/brokers/profile`, {
            suppressErrorToast: true,
        });
        return { data: mapManagerProfile(data, { id: userId }), error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const getManagers = async (status?: string, page = 1, limit = 50): Promise<{ data: ManagerProfile[]; total: number; error: string | null }> => {
    try {
        const firstPage = await fetchManagersPage(status, page, limit);
        let brokers = firstPage.data || [];
        const total = firstPage.pagination?.total || brokers.length;

        if (page === 1 && total > brokers.length) {
            const remainingPageCount = Math.ceil(total / limit) - 1;
            const remainingPages = await Promise.all(
                Array.from({ length: remainingPageCount }, (_, index) => fetchManagersPage(status, index + 2, limit)),
            );

            for (const response of remainingPages) {
                brokers = brokers.concat(response.data || []);
            }
        }

        const userInfoEntries = await Promise.all(
            brokers.map(async (broker) => [broker.user_id, await getUserInfo(broker.user_id)] as const),
        );
        const userInfoById = new Map(userInfoEntries);

        const profiles = brokers
            .map((broker) => mapManagerProfile(broker, userInfoById.get(broker.user_id)))
            .sort((left, right) => (
                new Date(right.submitted_at || right.updated_at || right.created_at).getTime()
                - new Date(left.submitted_at || left.updated_at || left.created_at).getTime()
            ));

        return { data: profiles, total, error: null };
    } catch (error: any) {
        return { data: [], total: 0, error: getErrorMessage(error) };
    }
};

export const getManagerVerificationSummary = async (userId: string): Promise<{ data: ManagerVerificationSummary | null; error: string | null }> => {
    try {
        const [profileRes, documents] = await Promise.all([
            getManagerProfile(userId),
            getCurrentManagerDocuments(),
        ]);

        if (profileRes.error && !isProfileNotFoundError(profileRes.error)) {
            return { data: null, error: profileRes.error };
        }

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

const buildCreateManagerProfilePayload = (data: Partial<ManagerProfile>) => ({
    company_name: data.company_name || '',
    branch_name: data.branch_name || '',
    company_description: data.company_description || '',
    company_reg_number: data.company_registration_number || data.license_number || '',
    business_phone: data.business_phone || '',
    company_address: data.company_address || '',
    registered_office_address: data.registered_office_address || '',
    complaints_contact: data.complaints_contact || '',
    redress_scheme_name: data.redress_scheme_name || '',
    redress_membership_number: data.redress_membership_number || '',
    cmp_provider: data.cmp_provider || '',
    cmp_certificate_url: data.cmp_certificate_url || '',
    license_expiry_date: data.license_expiry_date || '',
    association_membership_id: data.association_membership_id || '',
    tax_id: data.tax_id || '',
    authorized_representative_name: data.authorized_representative_name || '',
    authorized_representative_email: data.authorized_representative_email || '',
    service_areas: JSON.stringify(normalizeManagerServiceAreas(data.service_areas)),
    dispatch_pincodes: JSON.stringify(Array.isArray(data.dispatch_pincodes) ? data.dispatch_pincodes : []),
    profile_type: data.profile_type || 'broker',
    has_ombudsman: data.has_ombudsman || false,
    has_insurance: data.has_insurance || false,
    has_client_money: data.has_client_money || false,
    arla_member: data.arla_member || false,
    naea_member: data.naea_member || false,
    rics_member: data.rics_member || false,
});

const buildUpdateManagerProfilePayload = (data: Partial<ManagerProfile>) => {
    const payload: Record<string, unknown> = {};

    if (data.profile_type !== undefined) payload.profile_type = data.profile_type;
    if (data.company_name !== undefined) payload.company_name = data.company_name;
    if (data.branch_name !== undefined) payload.branch_name = data.branch_name;
    if (data.company_description !== undefined) payload.company_description = data.company_description;
    if (data.business_phone !== undefined) payload.business_phone = data.business_phone;
    if (data.company_registration_number !== undefined || data.license_number !== undefined) {
        payload.company_reg_number = data.company_registration_number || data.license_number || '';
    }
    if (data.company_address !== undefined) payload.company_address = data.company_address;
    if (data.registered_office_address !== undefined) payload.registered_office_address = data.registered_office_address;
    if (data.complaints_contact !== undefined) payload.complaints_contact = data.complaints_contact;
    if (data.redress_scheme_name !== undefined) payload.redress_scheme_name = data.redress_scheme_name;
    if (data.redress_membership_number !== undefined) payload.redress_membership_number = data.redress_membership_number;
    if (data.cmp_provider !== undefined) payload.cmp_provider = data.cmp_provider;
    if (data.cmp_certificate_url !== undefined) payload.cmp_certificate_url = data.cmp_certificate_url;
    if (data.license_expiry_date !== undefined) payload.license_expiry_date = data.license_expiry_date;
    if (data.association_membership_id !== undefined) payload.association_membership_id = data.association_membership_id;
    if (data.tax_id !== undefined) payload.tax_id = data.tax_id;
    if (data.authorized_representative_name !== undefined) payload.authorized_representative_name = data.authorized_representative_name;
    if (data.authorized_representative_email !== undefined) payload.authorized_representative_email = data.authorized_representative_email;
    if (data.service_areas !== undefined) payload.service_areas = JSON.stringify(normalizeManagerServiceAreas(data.service_areas));
    if (data.dispatch_pincodes !== undefined) payload.dispatch_pincodes = JSON.stringify(data.dispatch_pincodes);
    if (data.has_ombudsman !== undefined) payload.has_ombudsman = data.has_ombudsman;
    if (data.has_insurance !== undefined) payload.has_insurance = data.has_insurance;
    if (data.has_client_money !== undefined) payload.has_client_money = data.has_client_money;
    if (data.arla_member !== undefined) payload.arla_member = data.arla_member;
    if (data.naea_member !== undefined) payload.naea_member = data.naea_member;
    if (data.rics_member !== undefined) payload.rics_member = data.rics_member;

    return payload;
};

export const createManagerProfile = async (_userId: string, data: Partial<ManagerProfile>): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(`${CORE_URL()}/api/v1/brokers/register`, {
            method: 'POST',
            suppressErrorToast: true,
            body: JSON.stringify(buildCreateManagerProfilePayload(data)),
        });

        return { data: mapManagerProfile(result), error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const updateManagerProfile = async (_userId: string, data: Partial<ManagerProfile>): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(`${CORE_URL()}/api/v1/brokers/profile`, {
            method: 'PUT',
            suppressErrorToast: true,
            body: JSON.stringify(buildUpdateManagerProfilePayload(data)),
        });

        return { data: mapManagerProfile(result), error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const uploadManagerDocument = async (
    file: File,
    managerId: string,
    documentType: ManagerDocumentType,
): Promise<{ url: string | null; path: string | null; error: string | null }> => {
    try {
        const uploadedFile = await uploadMediaFile(file, 'document', managerId, file.name, false);

        const result = await apiFetch<any>(`${CORE_URL()}/api/v1/documents`, {
            method: 'POST',
            suppressErrorToast: true,
            body: JSON.stringify({
                document_type: documentType,
                document_category: mapDocumentCategory(documentType),
                media_id: uploadedFile.id,
                file_name: file.name,
                file_url: uploadedFile.file_url,
                file_size: file.size,
                mime_type: file.type,
            }),
        });

        return { url: result.file_url || null, path: result.file_url || null, error: null };
    } catch (error: any) {
        return { url: null, path: null, error: getErrorMessage(error) };
    }
};

export const submitManagerDocument = async (data: any): Promise<{ data: ManagerDocument | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(`${CORE_URL()}/api/v1/documents`, {
            method: 'POST',
            suppressErrorToast: true,
            body: JSON.stringify(data),
        });

        return { data: mapManagerDocument(result), error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
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
            suppressErrorToast: true,
        });

        return { error: null };
    } catch (error: any) {
        return { error: getErrorMessage(error) };
    }
};

export const getManagerVerificationDetails = async (userId: string): Promise<{ data: ManagerVerificationDetails | null; error: string | null }> => {
    try {
        const data = await apiFetch<any>(`${CORE_URL()}/api/v1/brokers/${userId}`, {
            suppressErrorToast: true,
        });
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
        return { data: null, error: getErrorMessage(error) };
    }
};

export const startReview = async (managerId: string, _actorId: string): Promise<{ error: string | null }> => {
    try {
        const details = await getManagerVerificationDetails(managerId);
        const pendingDocuments = details.data?.documents.filter((document) => document.verification_status === 'pending') || [];

        await Promise.all(
            pendingDocuments.map((document) => apiFetch(`${CORE_URL()}/api/v1/documents/${document.id}/review`, {
                method: 'PUT',
                suppressErrorToast: true,
                body: JSON.stringify({ status: 'under_review' }),
            })),
        );

        return { error: null };
    } catch (error: any) {
        return { error: getErrorMessage(error) };
    }
};

export const approveManager = async (managerId: string, _actorId: string, notes?: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/brokers/${managerId}/verify`, {
            method: 'PUT',
            suppressErrorToast: true,
            body: JSON.stringify({
                status: 'approved',
                admin_notes: notes || '',
                fast_track_eligible: true,
            }),
        });

        return { error: null };
    } catch (error: any) {
        return { error: getErrorMessage(error) };
    }
};

export const rejectManager = async (managerId: string, _actorId: string, reason: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/brokers/${managerId}/verify`, {
            method: 'PUT',
            suppressErrorToast: true,
            body: JSON.stringify({
                status: 'rejected',
                admin_notes: reason,
                fast_track_eligible: false,
            }),
        });

        return { error: null };
    } catch (error: any) {
        return { error: getErrorMessage(error) };
    }
};

export const revokeManagerApproval = async (managerId: string, _actorId: string, reason: string): Promise<{ data: boolean; error: string | null }> => {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/brokers/${managerId}/verify`, {
            method: 'PUT',
            suppressErrorToast: true,
            body: JSON.stringify({
                status: 'rejected',
                admin_notes: `Approval revoked: ${reason}`,
                fast_track_eligible: false,
            }),
        });

        return { data: true, error: null };
    } catch (error: any) {
        return { data: false, error: getErrorMessage(error) };
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
            suppressErrorToast: true,
            body: JSON.stringify({
                status: 'reupload_required',
                reject_reason: reason,
            }),
        });

        return { error: null };
    } catch (error: any) {
        return { error: getErrorMessage(error) };
    }
};

export const submitForVerification = async (_managerId: string): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    try {
        const result = await apiFetch<any>(`${CORE_URL()}/api/v1/brokers/profile/submit`, {
            method: 'POST',
            suppressErrorToast: true,
        });

        return { data: mapManagerProfile(result), error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

// ============================================================================
// Manager User Verification (For Tenants/Users)
// ============================================================================

export type UserVerificationLevel = 'basic' | 'verified' | 'fully_verified';

export interface UserVerificationInfo {
    user_id: string;
    email: string;
    full_name: string;
    phone?: string;
    avatar?: string;
    address?: string;
    postcode?: string;
    verification_level: UserVerificationLevel;
    has_identity_doc: boolean;
    has_address_doc: boolean;
    has_financial_doc: boolean;
    documents_uploaded: boolean;
    documents_verified: boolean;
    lead_count: number;
    pending_leads: number;
    created_at: string;
    last_active: string;
}

export interface UserDocument {
    id: string;
    user_id: string;
    document_type: string;
    document_category: string;
    file_name: string;
    file_url: string;
    status: 'pending' | 'approved' | 'rejected' | 'reupload_required' | 'under_review';
    reject_reason?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    created_at: string;
    updated_at: string;
}

export interface UserVerificationDetails {
    user: UserVerificationInfo;
    documents: UserDocument[];
    recent_leads: any[];
}

export const getManagerPendingUserVerifications = async (): Promise<{ data: UserVerificationInfo[]; error: string | null }> => {
    try {
        const response = await apiFetchEnvelope<UserVerificationInfo[]>(`${CORE_URL()}/api/v1/manager/users/pending-verification`, {
            suppressErrorToast: true,
        });
        return { data: response.data || [], error: null };
    } catch (error: any) {
        return { data: [], error: getErrorMessage(error) };
    }
};

export const getManagerUserVerificationDetails = async (userId: string): Promise<{ data: UserVerificationDetails | null; error: string | null }> => {
    try {
        const data = await apiFetch<UserVerificationDetails>(`${CORE_URL()}/api/v1/manager/users/${userId}/verification`, {
            suppressErrorToast: true,
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const verifyUserByManager = async (userId: string, status: string, notes?: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/manager/users/${userId}/verify`, {
            method: 'PUT',
            suppressErrorToast: true,
            body: JSON.stringify({
                status,
                notes: notes || '',
            }),
        });
        return { error: null };
    } catch (error: any) {
        return { error: getErrorMessage(error) };
    }
};

export const reviewUserDocumentByManager = async (documentId: string, status: string, rejectReason?: string): Promise<{ error: string | null }> => {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/manager/documents/${documentId}/review`, {
            method: 'PUT',
            suppressErrorToast: true,
            body: JSON.stringify({
                status,
                reject_reason: rejectReason || '',
            }),
        });
        return { error: null };
    } catch (error: any) {
        return { error: getErrorMessage(error) };
    }
};

export const getVerificationLevelLabel = (level: UserVerificationLevel): string => {
    switch (level) {
        case 'fully_verified':
            return 'Fully Verified';
        case 'verified':
            return 'Verified';
        default:
            return 'Basic';
    }
};

export const getVerificationLevelColor = (level: UserVerificationLevel): { bg: string; text: string } => {
    switch (level) {
        case 'fully_verified':
            return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
        case 'verified':
            return { bg: 'bg-blue-100', text: 'text-blue-700' };
        default:
            return { bg: 'bg-amber-100', text: 'text-amber-700' };
    }
};
