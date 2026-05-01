/**
 * Reviews Service
 * Fetches and manages property reviews from the core-service backend
 */

import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface Review {
    id: string;
    property_id: string;
    user_id: string;
    rating: number;
    title?: string;
    comment: string;
    is_approved: boolean;
    approved_by?: string;
    created_at: string;
    updated_at: string;
    // Derived convenience field for display
    status?: 'pending' | 'approved';
}

export interface ReviewResponse {
    success: boolean;
    data: {
        reviews: Review[];
        average_rating: number;
        total_reviews: number;
    } | null;
    error?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function normaliseReview(r: Review): Review {
    return { ...r, status: r.is_approved ? 'approved' : 'pending' };
}

// ── API Functions ───────────────────────────────────────────────────────────

export async function getPropertyReviews(propertyId: string): Promise<ReviewResponse> {
    try {
        const data = await apiFetch<{
            reviews: Review[];
            average_rating: number;
            total_reviews: number;
        }>(`${CORE_URL()}/api/v1/reviews/property/${propertyId}`, {
            suppressErrorToast: true,
        });
        return {
            success: true,
            data: { ...data, reviews: data.reviews.map(normaliseReview) },
        };
    } catch (error: any) {
        return { success: false, data: null, error: getErrorMessage(error) };
    }
}

export async function getUserReviews(): Promise<{ success: boolean; data: Review[] | null; error?: string }> {
    try {
        const data = await apiFetch<Review[]>(`${CORE_URL()}/api/v1/reviews/mine`, {
            suppressErrorToast: true,
        });
        return { success: true, data: data.map(normaliseReview) };
    } catch (error: any) {
        return { success: false, data: null, error: getErrorMessage(error) };
    }
}

export async function createReview(reviewData: {
    property_id: string;
    rating: number;
    comment: string;
    title?: string;
}): Promise<{ success: boolean; data: Review | null; error?: string }> {
    try {
        const data = await apiFetch<Review>(`${CORE_URL()}/api/v1/reviews`, {
            method: 'POST',
            suppressErrorToast: true,
            body: JSON.stringify(reviewData),
        });
        return { success: true, data: normaliseReview(data) };
    } catch (error: any) {
        return { success: false, data: null, error: getErrorMessage(error) };
    }
}

export async function deleteReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/reviews/${reviewId}`, {
            method: 'DELETE',
            suppressErrorToast: true,
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function getAdminReviews(): Promise<{ success: boolean; data: Review[] | null; error?: string }> {
    try {
        const data = await apiFetch<Review[]>(`${CORE_URL()}/api/v1/admin/reviews`, {
            suppressErrorToast: true,
        });
        return { success: true, data: data.map(normaliseReview) };
    } catch (error: any) {
        return { success: false, data: null, error: getErrorMessage(error) };
    }
}

export async function approveReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await apiFetch(`${CORE_URL()}/api/v1/reviews/${reviewId}/approve`, {
            method: 'PUT',
            suppressErrorToast: true,
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export const reviewsService = {
    getPropertyReviews,
    getUserReviews,
    createReview,
    deleteReview,
    getAdminReviews,
    approveReview,
};
