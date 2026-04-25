import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import type { ApiFetchOptions } from '@/lib/apiUtils';
import type { JourneyAction, JourneyBlocker, JourneyDeadline, JourneyRequirement, JourneyState, JourneyStateFields } from '@/types/journey';

const BOOKING_URL = () => getServiceUrl('booking');
type ServiceRequestOptions = Pick<ApiFetchOptions, 'suppressErrorToast'>;

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

export interface SaleProgression extends JourneyStateFields {
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
    property_country?: string;
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

export type SaleProgressionStage = SaleProgression['current_stage'];

export const getSaleProgressions = async (
    options: ServiceRequestOptions = {},
): Promise<{ data: SaleProgression[] | null; error: string | null }> => {
    try {
        const data = await apiFetch<SaleProgression[]>(`${BOOKING_URL()}/api/v1/sale-progressions`, options);
        return { data: data?.map(normalizeSaleProgression) || [], error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const updateSaleProgression = async (
    progressionId: string,
    currentStage: SaleProgression['current_stage'],
    notes?: string,
    options: ServiceRequestOptions = {},
): Promise<{ data: SaleProgression | null; error: string | null }> => {
    try {
        const data = await apiFetch<SaleProgression>(`${BOOKING_URL()}/api/v1/sale-progressions/${progressionId}`, {
            method: 'PUT',
            body: JSON.stringify({
                current_stage: currentStage,
                notes,
            }),
            suppressErrorToast: options.suppressErrorToast,
        });
        return { data: data ? normalizeSaleProgression(data) : null, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const createOffer = async (payload: {
    application_id?: string;
    property_id: string;
    manager_id: string;
    lead_id?: string;
    fast_track_case_id?: string;
    amount: number;
    currency?: string;
    notes?: string;
}, options: ServiceRequestOptions = {}): Promise<{ data: Offer | null; error: string | null }> => {
    try {
        const data = await apiFetch<Offer>(`${BOOKING_URL()}/api/v1/offers`, {
            method: 'POST',
            body: JSON.stringify(payload),
            suppressErrorToast: options.suppressErrorToast,
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

const normalizeSaleProgression = (progression: SaleProgression): SaleProgression => ({
    ...progression,
    journeyState: progression.journey_state || progression.journeyState || null,
    jurisdictionProfile: progression.jurisdiction_profile || progression.jurisdictionProfile || progression.journey_state?.jurisdiction_profile,
    liveStage: progression.live_stage || progression.liveStage || progression.journey_state?.live_stage,
    stageGroup: progression.stage_group || progression.stageGroup || progression.journey_state?.stage_group,
    journeyStatusReason: progression.journey_status_reason || progression.journeyStatusReason || progression.journey_state?.journey_status_reason,
    blockers: progression.blockers || progression.journey_state?.blockers || [],
    deadlines: progression.deadlines || progression.journey_state?.deadlines || [],
    requiredEvidence: progression.required_evidence || progression.requiredEvidence || progression.journey_state?.required_evidence || [],
    nextActions: progression.next_actions || progression.nextActions || progression.journey_state?.next_actions || [],
});
