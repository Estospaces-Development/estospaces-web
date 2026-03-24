/**
 * Applications Service
 * Fetches rental/sale application data from the booking-service backend
 */

import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import type { ApiFetchOptions } from '@/lib/apiUtils';

const BOOKING_URL = () => getServiceUrl('booking');

export interface Application {
    id: string;
    property_id: string;
    user_id: string;
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
}

export interface ApplicationsResponse {
    data: Application[] | null;
    error: string | null;
}

export interface ApplicationResponse {
    data: Application | null;
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
        return { data, error: null };
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
        return { data, error: null };
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
        return { data, error: null };
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
        return { data, error: null };
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
        return { data, error: null };
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
};
