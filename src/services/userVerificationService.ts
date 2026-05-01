import { apiFetch, apiFetchEnvelope, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import type { ApiFetchOptions } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export type VerificationScope = 'admin' | 'manager';
type ServiceRequestOptions = Pick<ApiFetchOptions, 'suppressErrorToast'>;
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
    lead_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface UserVerificationDetails {
    user: UserVerificationInfo;
    documents: UserDocument[];
    recent_leads: Array<{
        id: string;
        status: string;
        created_at: string;
        property_id?: string;
    }>;
}

const getScopeBasePath = (scope: VerificationScope): string => (
    scope === 'admin'
        ? `${CORE_URL()}/api/v1/admin`
        : `${CORE_URL()}/api/v1/manager`
);

export const getPendingUserVerifications = async (
    scope: VerificationScope,
    options: ServiceRequestOptions = {},
): Promise<{ data: UserVerificationInfo[]; error: string | null }> => {
    try {
        const response = await apiFetchEnvelope<UserVerificationInfo[]>(
            `${getScopeBasePath(scope)}/users/pending-verification`,
            { suppressErrorToast: options.suppressErrorToast ?? true },
        );
        return { data: response.data || [], error: null };
    } catch (error: any) {
        return { data: [], error: getErrorMessage(error) };
    }
};

export const getUserVerificationDetails = async (
    scope: VerificationScope,
    userId: string,
): Promise<{ data: UserVerificationDetails | null; error: string | null }> => {
    try {
        const data = await apiFetch<UserVerificationDetails>(
            `${getScopeBasePath(scope)}/users/${userId}/verification`,
            { suppressErrorToast: true },
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const updateUserVerification = async (
    scope: VerificationScope,
    userId: string,
    status: 'verified' | 'rejected',
    notes?: string,
): Promise<{ error: string | null }> => {
    try {
        await apiFetch(`${getScopeBasePath(scope)}/users/${userId}/verify`, {
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

export const reviewUserDocument = async (
    scope: VerificationScope,
    documentId: string,
    status: 'approved' | 'rejected' | 'reupload_required',
    rejectReason?: string,
): Promise<{ error: string | null }> => {
    try {
        const basePath = scope === 'admin'
            ? `${getScopeBasePath(scope)}/documents/${documentId}/review`
            : `${CORE_URL()}/api/v1/manager/documents/${documentId}/review`;

        await apiFetch(basePath, {
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

export const getVerificationLevelColor = (
    level: UserVerificationLevel,
): { bg: string; text: string } => {
    switch (level) {
        case 'fully_verified':
            return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
        case 'verified':
            return { bg: 'bg-blue-100', text: 'text-blue-700' };
        default:
            return { bg: 'bg-amber-100', text: 'text-amber-700' };
    }
};
