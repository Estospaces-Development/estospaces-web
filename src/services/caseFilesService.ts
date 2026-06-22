import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import type { ApiFetchOptions } from '@/lib/apiUtils';
import type { JourneyState } from '@/types/journey';
import type { PropertyComplianceReadiness } from '@/services/propertyService';
import type { Application } from '@/services/applicationsService';
import type { FastTrackCase } from '@/services/fastTrackService';
import type { UserDocument } from '@/services/leadsService';
import type { Invoice } from '@/services/paymentsService';
import type { SaleProgression } from '@/services/salesService';
import type { Viewing } from '@/services/bookingsService';
import type { Contract } from '@/types/booking';

const BOOKING_URL = () => getServiceUrl('booking');
const CORE_URL = () => getServiceUrl('core');
type ServiceRequestOptions = Pick<ApiFetchOptions, 'suppressErrorToast'>;

export interface CaseFileDocument {
    id: string;
    document_id: string;
    fast_track_case_id: string;
    user_id: string;
    manager_id?: string;
    lead_id?: string | null;
    application_id?: string | null;
    contract_id?: string | null;
    property_id?: string | null;
    request_id?: string | null;
    link_family: string;
    visibility: string;
    requirement_codes: string[];
    reusable: boolean;
    status: string;
    linked_by: string;
    linked_by_role: string;
    can_download: boolean;
    latest_review?: Record<string, any> | null;
    document: UserDocument;
}

export interface CaseFileRequest {
    id: string;
    fast_track_case_id: string;
    user_id: string;
    manager_id?: string;
    lead_id?: string | null;
    application_id?: string | null;
    contract_id?: string | null;
    property_id?: string | null;
    link_family: string;
    visibility: string;
    requirement_codes: string[];
    title: string;
    description?: string;
    status: string;
    requested_by: string;
    requested_by_role: string;
    last_document_id?: string | null;
    due_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CaseFileActivityEvent {
    id: string;
    type: string;
    title: string;
    description?: string;
    actor_id?: string;
    actor_role?: string;
    created_at: string;
    data?: Record<string, any>;
}

export interface VirtualStorageCategory {
    id: string;
    user_id?: string;
    name: string;
    slug: string;
    source: string;
    created_by?: string;
    created_by_role?: string;
    fast_track_case_id?: string | null;
    lead_id?: string | null;
    application_id?: string | null;
    contract_id?: string | null;
    property_id?: string | null;
    request_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface CaseFileArtifact {
    id: string;
    artifact_type: string;
    title: string;
    status: string;
    description?: string;
    url?: string;
    can_download: boolean;
    created_at: string;
}

export interface CaseFileInvoice extends Invoice {}

export interface CaseFile {
    case_id: string;
    user_id: string;
    manager_id?: string;
    lead_id?: string | null;
    application_id?: string | null;
    contract_id?: string | null;
    sale_progression_id?: string | null;
    property_id: string;
    property_title?: string;
    listing_type?: string;
    workflow?: JourneyState | null;
    fast_track_case?: FastTrackCase | null;
    application?: Application | null;
    viewing?: Viewing | null;
    contract?: Contract | null;
    sale_progression?: SaleProgression | null;
    property_compliance_readiness?: PropertyComplianceReadiness | null;
    document_limit?: number;
    document_count?: number;
    manager_suggested_categories?: VirtualStorageCategory[];
    documents: CaseFileDocument[];
    requests: CaseFileRequest[];
    available_reusable_documents: UserDocument[];
    activity: CaseFileActivityEvent[];
    artifacts: CaseFileArtifact[];
    invoices: CaseFileInvoice[];
}

export interface CaseFileDocumentRequestPayload {
    user_id: string;
    manager_id?: string;
    lead_id?: string;
    application_id?: string;
    contract_id?: string;
    property_id?: string;
    link_family?: string;
    visibility?: string;
    requirement_codes?: string[];
    title: string;
    description?: string;
    due_at?: string;
}

export interface CaseFileDocumentLinkPayload {
    document_id: string;
    user_id?: string;
    manager_id?: string;
    lead_id?: string;
    application_id?: string;
    contract_id?: string;
    property_id?: string;
    request_id?: string;
    link_family?: string;
    visibility?: string;
    requirement_codes?: string[];
    reusable?: boolean;
}

export interface CaseFileDocumentReviewPayload {
    status: 'approved' | 'rejected' | 'reupload_required' | 'under_review';
    reject_reason?: string;
}

export const getCaseFile = async (caseId: string, options: ServiceRequestOptions = {}): Promise<{ data: CaseFile | null; error: string | null }> => {
    try {
        const data = await apiFetch<CaseFile>(`${BOOKING_URL()}/api/v1/case-files/${caseId}`, options);
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const createCaseFileDocumentRequest = async (
    caseId: string,
    payload: CaseFileDocumentRequestPayload,
): Promise<{ data: CaseFileRequest | null; error: string | null }> => {
    try {
        const data = await apiFetch<CaseFileRequest>(`${CORE_URL()}/api/v1/case-files/${caseId}/document-requests`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const linkDocumentToCaseFile = async (
    caseId: string,
    payload: CaseFileDocumentLinkPayload,
): Promise<{ data: CaseFileDocument | null; error: string | null }> => {
    try {
        const data = await apiFetch<CaseFileDocument>(`${CORE_URL()}/api/v1/case-files/${caseId}/document-links`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const reviewCaseFileDocumentLink = async (
    caseId: string,
    linkId: string,
    payload: CaseFileDocumentReviewPayload,
): Promise<{ data: CaseFileDocument | null; error: string | null }> => {
    try {
        const data = await apiFetch<CaseFileDocument>(`${CORE_URL()}/api/v1/case-files/${caseId}/document-links/${linkId}/review`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const unlinkCaseFileDocument = async (
    caseId: string,
    linkId: string,
): Promise<{ error: string | null }> => {
    try {
        await apiFetch<void>(`${CORE_URL()}/api/v1/case-files/${caseId}/document-links/${linkId}`, {
            method: 'DELETE',
        });
        return { error: null };
    } catch (error: any) {
        return { error: getErrorMessage(error) };
    }
};
