import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';

const BOOKING_URL = () => getServiceUrl('booking');

export interface Offer {
    id: string;
    property_id: string;
    user_id: string;
    manager_id: string;
    lead_id?: string | null;
    fast_track_case_id?: string | null;
    amount: number;
    currency: string;
    status: string;
    notes?: string;
    submitted_at: string;
    reviewed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface SaleProgression {
    id: string;
    property_id: string;
    user_id: string;
    manager_id: string;
    lead_id?: string | null;
    fast_track_case_id?: string | null;
    offer_id?: string | null;
    memorandum_id?: string | null;
    current_stage: 'offer_submitted' | 'offer_under_review' | 'offer_accepted' | 'sale_agreed' | 'memorandum_issued' | 'conveyancing' | 'exchange' | 'completion';
    status: 'active' | 'completed';
    completed_at?: string | null;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export const getSaleProgressions = async (): Promise<{ data: SaleProgression[] | null; error: string | null }> => {
    try {
        const data = await apiFetch<SaleProgression[]>(`${BOOKING_URL()}/api/v1/sale-progressions`);
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const updateSaleProgression = async (
    progressionId: string,
    currentStage: SaleProgression['current_stage'],
    notes?: string,
): Promise<{ data: SaleProgression | null; error: string | null }> => {
    try {
        const data = await apiFetch<SaleProgression>(`${BOOKING_URL()}/api/v1/sale-progressions/${progressionId}`, {
            method: 'PUT',
            body: JSON.stringify({
                current_stage: currentStage,
                notes,
            }),
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const createOffer = async (payload: {
    property_id: string;
    manager_id: string;
    lead_id?: string;
    fast_track_case_id?: string;
    amount: number;
    currency?: string;
    notes?: string;
}): Promise<{ data: Offer | null; error: string | null }> => {
    try {
        const data = await apiFetch<Offer>(`${BOOKING_URL()}/api/v1/offers`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};
