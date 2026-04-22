import type { BrokerRequestRecord } from '@/services/leadsService';

export interface BrokerRequestTrackingSummary {
    currentStage: string;
    currentStageNumber: number;
    totalStages: number;
    progress: number;
    nextAction: string;
}

const normalizeStatus = (value?: string | null) => String(value || '').trim().toLowerCase();

export const isLiveBrokerRequest = (
    request: Pick<BrokerRequestRecord, 'status' | 'dispatch_status'> | null | undefined,
) => {
    const status = normalizeStatus(request?.status);
    const dispatchStatus = normalizeStatus(request?.dispatch_status);

    return status !== 'expired' && status !== 'cancelled' && dispatchStatus !== 'expired';
};

export const getBrokerRequestTrackingSummary = (
    request: Pick<BrokerRequestRecord, 'status' | 'dispatch_status' | 'dispatch_wave' | 'dispatched_broker_count' | 'matched_broker' | 'handoff_status' | 'selected_property_id' | 'selected_fast_track_case_id' | 'property_shares'>,
): BrokerRequestTrackingSummary => {
    const status = normalizeStatus(request.status);
    const dispatchStatus = normalizeStatus(request.dispatch_status);
    const handoffStatus = normalizeStatus(request.handoff_status);
    const hasSharedProperties = Boolean(request.property_shares && request.property_shares.length > 0);
    const isMatched = dispatchStatus === 'broker_matched' || status === 'matched' || Boolean(request.matched_broker);

    if (handoffStatus === 'property_selected' || Boolean(request.selected_fast_track_case_id) || Boolean(request.selected_property_id)) {
        return {
            currentStage: 'Property Selected',
            currentStageNumber: 5,
            totalStages: 5,
            progress: 100,
            nextAction: 'Open live fast-track',
        };
    }

    if (handoffStatus === 'portfolio_shared' || hasSharedProperties) {
        return {
            currentStage: 'Properties Shared',
            currentStageNumber: 4,
            totalStages: 5,
            progress: 80,
            nextAction: 'Choose a property',
        };
    }

    if (handoffStatus === 'awaiting_portfolio' || isMatched) {
        return {
            currentStage: 'Broker Matched',
            currentStageNumber: 3,
            totalStages: 5,
            progress: 60,
            nextAction: 'Wait for property options',
        };
    }

    if ((request.dispatch_wave || 1) > 1 || (request.dispatched_broker_count || 0) > 0) {
        return {
            currentStage: 'Nearby Brokers Pinged',
            currentStageNumber: 2,
            totalStages: 5,
            progress: 40,
            nextAction: 'Track broker responses',
        };
    }

    return {
        currentStage: 'Request Sent',
        currentStageNumber: 1,
        totalStages: 5,
        progress: 20,
        nextAction: 'Wait for broker responses',
    };
};
