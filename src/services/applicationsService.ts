/**
 * Applications Service
 * Fetches rental/sale application data from the booking-service backend
 */

import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import type { ApiFetchOptions } from '@/lib/apiUtils';
import type { JourneyState, JourneyStateFields, JourneyBlocker, JourneyDeadline, JourneyRequirement, JourneyAction } from '@/types/journey';

const BOOKING_URL = () => getServiceUrl('booking');

export interface Application extends JourneyStateFields {
    id: string;
    property_id: string;
    user_id: string;
    broker_request_id?: string | null;
    lead_id?: string | null;
    fast_track_case_id?: string | null;
    manager_id?: string | null;
    applicant_name?: string;
    applicant_email?: string;
    applicant_phone?: string;
    property_title?: string;
    property_address?: string;
    property_image?: string;
    property_type?: string;
    listing_type?: string;
    property_price?: number;
    agent_name?: string;
    agent_email?: string;
    agent_phone?: string;
    agent_agency?: string;
    conversation_id?: string | null;
    move_in_date: string;
    lease_duration_months?: number;
    employment_status?: string;
    employer_name?: string;
    annual_income?: number;
    current_address?: string;
    message?: string;
    status: string;
    reviewed_by?: string;
    reviewed_at?: string;
    review_notes?: string;
    created_at: string;
    updated_at: string;
    journeyState?: JourneyState | null;
    jurisdictionProfile?: string;
    liveStage?: string;
    stageGroup?: string;
    journeyStatusReason?: string;
    blockers?: JourneyBlocker[];
    deadlines?: JourneyDeadline[];
    requiredEvidence?: JourneyRequirement[];
    nextActions?: JourneyAction[];
}

export interface ApplicationsResponse {
    data: Application[] | null;
    error: string | null;
}

export interface ApplicationResponse {
    data: Application | null;
    error: string | null;
}

export interface BuyerQualification {
    id: string;
    application_id: string;
    status: string;
    mortgage_in_principle_verified: boolean;
    proof_of_funds_verified: boolean;
    verified_at?: string | null;
    reviewer_id?: string | null;
    review_notes?: string;
    created_at: string;
    updated_at: string;
}

export interface AMLReview {
    id: string;
    application_id: string;
    status: string;
    identity_status?: string;
    source_of_funds_status?: string;
    verified_at?: string | null;
    reviewer_id?: string | null;
    review_notes?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkflowRecordResponse<T> {
    data: T | null;
    error: string | null;
}

type ServiceRequestOptions = Pick<ApiFetchOptions, 'suppressErrorToast'>;

/**
 * Fetch applications for the logged-in user
 * GET /api/v1/applications (booking-service)
 */
export const getApplications = async (options: ServiceRequestOptions = {}): Promise<ApplicationsResponse> => {
    try {
        const data = await apiFetch<Application[]>(
            `${BOOKING_URL()}/api/v1/applications`,
            options,
        );
        return { data: data?.map(normalizeApplication) || [], error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

/**
 * Fetch a single application by ID
 * GET /api/v1/applications/:id (booking-service)
 */
export const getApplicationById = async (applicationId: string): Promise<ApplicationResponse> => {
    try {
        const data = await apiFetch<Application>(
            `${BOOKING_URL()}/api/v1/applications/${applicationId}`,
        );
        return { data: data ? normalizeApplication(data) : null, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

/**
 * Create a new application
 * POST /api/v1/applications (booking-service)
 */
export const createApplication = async (applicationData: {
    property_id: string;
    manager_id: string;
    lead_id?: string;
    fast_track_case_id?: string;
    applicant_name?: string;
    applicant_email?: string;
    applicant_phone?: string;
    property_title?: string;
    property_address?: string;
    property_image?: string;
    property_type?: string;
    listing_type?: string;
    property_price?: number;
    agent_name?: string;
    agent_email?: string;
    agent_phone?: string;
    agent_agency?: string;
    conversation_id?: string;
    move_in_date: string;
    lease_duration_months?: number;
    employment_status?: string;
    employer_name?: string;
    annual_income?: number;
    current_address?: string;
    message?: string;
}): Promise<ApplicationResponse> => {
    try {
        const data = await apiFetch<Application>(
            `${BOOKING_URL()}/api/v1/applications`,
            {
                method: 'POST',
                body: JSON.stringify(applicationData),
            },
        );
        return { data: data ? normalizeApplication(data) : null, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const updateApplicationStatus = async (
    applicationId: string,
    status: string,
    reviewNotes?: string,
): Promise<ApplicationResponse> => {
    try {
        const data = await apiFetch<Application>(
            `${BOOKING_URL()}/api/v1/applications/${applicationId}/status`,
            {
                method: 'PUT',
                body: JSON.stringify({ status, review_notes: reviewNotes }),
            },
        );
        return { data: data ? normalizeApplication(data) : null, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const withdrawApplication = async (applicationId: string): Promise<ApplicationResponse> => {
    try {
        const data = await apiFetch<Application>(
            `${BOOKING_URL()}/api/v1/applications/${applicationId}/withdraw`,
            {
                method: 'PUT',
            },
        );
        return { data: data ? normalizeApplication(data) : null, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

/**
 * Review an application (approve/reject)
 * PUT /api/v1/applications/:id/review (booking-service)
 */
export const reviewApplication = async (
    applicationId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string,
): Promise<ApplicationResponse> => {
    try {
        const data = await apiFetch<Application>(
            `${BOOKING_URL()}/api/v1/applications/${applicationId}/review`,
            {
                method: 'PUT',
                body: JSON.stringify({ status, review_notes: reviewNotes }),
            },
        );
        return { data: data ? normalizeApplication(data) : null, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const getBuyerQualification = async (applicationId: string): Promise<WorkflowRecordResponse<BuyerQualification>> => {
    try {
        const data = await apiFetch<BuyerQualification>(
            `${BOOKING_URL()}/api/v1/applications/${applicationId}/buyer-qualification`,
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const updateBuyerQualification = async (
    applicationId: string,
    payload: {
        status: string;
        review_notes?: string;
        verified_at?: string;
        mortgage_in_principle_verified?: boolean;
        proof_of_funds_verified?: boolean;
    },
): Promise<WorkflowRecordResponse<BuyerQualification>> => {
    try {
        const data = await apiFetch<BuyerQualification>(
            `${BOOKING_URL()}/api/v1/applications/${applicationId}/buyer-qualification`,
            {
                method: 'PUT',
                body: JSON.stringify(payload),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const getAMLReview = async (applicationId: string): Promise<WorkflowRecordResponse<AMLReview>> => {
    try {
        const data = await apiFetch<AMLReview>(
            `${BOOKING_URL()}/api/v1/applications/${applicationId}/aml-review`,
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const updateAMLReview = async (
    applicationId: string,
    payload: {
        status: string;
        review_notes?: string;
        verified_at?: string;
        identity_status?: string;
        source_of_funds_status?: string;
    },
): Promise<WorkflowRecordResponse<AMLReview>> => {
    try {
        const data = await apiFetch<AMLReview>(
            `${BOOKING_URL()}/api/v1/applications/${applicationId}/aml-review`,
            {
                method: 'PUT',
                body: JSON.stringify(payload),
            },
        );
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const applicationsService = {
    getApplications,
    getApplicationById,
    createApplication,
    reviewApplication,
    updateApplicationStatus,
    withdrawApplication,
    getBuyerQualification,
    updateBuyerQualification,
    getAMLReview,
    updateAMLReview,
};

const normalizeApplication = (application: Application): Application => ({
    ...application,
    journeyState: application.journey_state || application.journeyState || null,
    jurisdictionProfile: application.jurisdiction_profile || application.jurisdictionProfile || application.journey_state?.jurisdiction_profile,
    liveStage: application.live_stage || application.liveStage || application.journey_state?.live_stage,
    stageGroup: application.stage_group || application.stageGroup || application.journey_state?.stage_group,
    journeyStatusReason: application.journey_status_reason || application.journeyStatusReason || application.journey_state?.journey_status_reason,
    blockers: application.blockers || application.journey_state?.blockers || [],
    deadlines: application.deadlines || application.journey_state?.deadlines || [],
    requiredEvidence: application.required_evidence || application.requiredEvidence || application.journey_state?.required_evidence || [],
    nextActions: application.next_actions || application.nextActions || application.journey_state?.next_actions || [],
});
