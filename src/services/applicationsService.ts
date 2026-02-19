/**
 * Applications Service
 * Fetches rental/sale application data from the booking-service backend
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const BOOKING_URL = () => getServiceUrl('booking');

export interface Application {
    id: string;
    property_id: string;
    user_id: string;
    move_in_date: string;
    lease_duration_months?: number;
    employment_status?: string;
    employer_name?: string;
    annual_income?: number;
    current_address?: string;
    reason_for_moving?: string;
    references?: string;
    document_urls?: string;
    status: 'submitted' | 'approved' | 'rejected' | 'withdrawn';
    reviewed_by?: string;
    reviewed_at?: string;
    review_notes?: string;
    created_at: string;
    updated_at: string;
    // UI-mapped fields (populated from join or client-side)
    name?: string;
    email?: string;
    phone?: string;
    propertyInterested?: string;
    score?: number;
    budget?: string;
    submittedDate?: string;
    lastContact?: string;
}

export interface ApplicationsResponse {
    data: Application[] | null;
    error: string | null;
}

export interface ApplicationResponse {
    data: Application | null;
    error: string | null;
}

/**
 * Fetch applications for the logged-in user
 * GET /api/v1/applications (booking-service)
 */
export const getApplications = async (): Promise<ApplicationsResponse> => {
    try {
        const data = await apiFetch<Application[]>(
            `${BOOKING_URL()}/api/v1/applications`,
        );
        return { data, error: null };
    } catch (error: any) {
        console.error('[applicationsService] Error:', error.message);
        return { data: null, error: error.message };
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
        console.error('[applicationsService] Error:', error.message);
        return { data: null, error: error.message };
    }
};

/**
 * Create a new application
 * POST /api/v1/applications (booking-service)
 */
export const createApplication = async (applicationData: {
    property_id: string;
    move_in_date: string;
    lease_duration_months?: number;
    employment_status?: string;
    employer_name?: string;
    annual_income?: number;
    current_address?: string;
    reason_for_moving?: string;
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
        console.error('[applicationsService] Error:', error.message);
        return { data: null, error: error.message };
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
        console.error('[applicationsService] Error:', error.message);
        return { data: null, error: error.message };
    }
};
