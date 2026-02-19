/**
 * Reviews Service
 * Fetches and manages property reviews from the core-service backend
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface Review {
    id: string;
    property_id: string;
    user_id: string;
    rating: number;
    comment: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
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

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Get reviews for a property
 */
export async function getPropertyReviews(propertyId: string): Promise<ReviewResponse> {
    try {
        return await apiFetch<ReviewResponse>(`${CORE_URL()}/api/v1/reviews/property/${propertyId}`);
    } catch (error: any) {
        console.error('[reviewsService] Error:', error.message);
        return { success: false, data: null, error: error.message };
    }
}

/**
 * Get current user's reviews
 */
export async function getUserReviews(): Promise<{ success: boolean; data: Review[] | null; error?: string }> {
    try {
        return await apiFetch<{ success: boolean; data: Review[] | null }>(`${CORE_URL()}/api/v1/reviews/mine`);
    } catch (error: any) {
        console.error('[reviewsService] Error:', error.message);
        return { success: false, data: null, error: error.message };
    }
}

/**
 * Create a review
 */
export async function createReview(reviewData: {
    property_id: string;
    rating: number;
    comment: string;
}): Promise<{ success: boolean; data: Review | null; error?: string }> {
    try {
        return await apiFetch<{ success: boolean; data: Review | null }>(`${CORE_URL()}/api/v1/reviews`, {
            method: 'POST',
            body: JSON.stringify(reviewData),
        });
    } catch (error: any) {
        console.error('[reviewsService] Error:', error.message);
        return { success: false, data: null, error: error.message };
    }
}

export const reviewsService = {
    getPropertyReviews,
    getUserReviews,
    createReview,
};
