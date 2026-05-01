import { apiFetch, apiFetchEnvelope, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export type ManagerReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ManagerReview {
    id: string;
    fast_track_case_id: string;
    manager_id: string;
    user_id: string;
    property_id?: string;
    property_title?: string;
    rating: number;
    comment?: string;
    approval_status: ManagerReviewStatus;
    approved_by?: string | null;
    approved_at?: string | null;
    created_at: string;
    updated_at: string;
    user_name?: string;
    manager_name?: string;
}

export async function getManagerReviewForCase(caseId: string) {
    try {
        const response = await apiFetchEnvelope<ManagerReview | null>(`${CORE_URL()}/api/v1/manager-reviews/case/${caseId}`, {
            suppressErrorToast: true,
        });
        const data = response.data ?? null;
        return { success: true, data, error: null as string | null };
    } catch (error: any) {
        return { success: false, data: null, error: getErrorMessage(error) };
    }
}

export async function createManagerReview(reviewData: {
    fast_track_case_id: string;
    rating: number;
    comment?: string;
}) {
    try {
        const data = await apiFetch<ManagerReview>(`${CORE_URL()}/api/v1/manager-reviews`, {
            method: 'POST',
            suppressErrorToast: true,
            body: JSON.stringify(reviewData),
        });
        return { success: true, data, error: null as string | null };
    } catch (error: any) {
        return { success: false, data: null, error: getErrorMessage(error) };
    }
}

export async function updateManagerReview(reviewId: string, reviewData: {
    rating: number;
    comment?: string;
}) {
    try {
        const data = await apiFetch<ManagerReview>(`${CORE_URL()}/api/v1/manager-reviews/${reviewId}`, {
            method: 'PUT',
            suppressErrorToast: true,
            body: JSON.stringify(reviewData),
        });
        return { success: true, data, error: null as string | null };
    } catch (error: any) {
        return { success: false, data: null, error: getErrorMessage(error) };
    }
}

export async function getAdminManagerReviews(status: 'all' | 'pending' | 'approved' = 'pending') {
    try {
        const query = status === 'all' ? '' : `?status=${encodeURIComponent(status)}`;
        const data = await apiFetch<ManagerReview[]>(`${CORE_URL()}/api/v1/admin/manager-reviews${query}`, {
            suppressErrorToast: true,
        });
        return { success: true, data, error: null as string | null };
    } catch (error: any) {
        return { success: false, data: null, error: getErrorMessage(error) };
    }
}

export async function approveManagerReview(reviewId: string) {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/admin/manager-reviews/${reviewId}/approve`, {
            method: 'PUT',
            suppressErrorToast: true,
        });
        return { success: true, error: null as string | null };
    } catch (error: any) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function deleteManagerReview(reviewId: string) {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/admin/manager-reviews/${reviewId}`, {
            method: 'DELETE',
            suppressErrorToast: true,
        });
        return { success: true, error: null as string | null };
    } catch (error: any) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export const managerReviewsService = {
    getManagerReviewForCase,
    createManagerReview,
    updateManagerReview,
    getAdminManagerReviews,
    approveManagerReview,
    deleteManagerReview,
};
