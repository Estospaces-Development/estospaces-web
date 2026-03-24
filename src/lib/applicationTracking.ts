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
    request: Pick<BrokerRequestRecord, 'status' | 'dispatch_status' | 'dispatch_wave' | 'matched_broker'>,
): BrokerRequestTrackingSummary => {
    const status = normalizeStatus(request.status);
    const dispatchStatus = normalizeStatus(request.dispatch_status);

    if (dispatchStatus === 'broker_matched' || status === 'matched' || Boolean(request.matched_broker)) {
        return {
            currentStage: 'Broker Matched',
            currentStageNumber: 3,
            totalStages: 3,
            progress: 100,
            nextAction: 'Open live workspace',
        };
    }

    if ((request.dispatch_wave || 1) > 1) {
        return {
            currentStage: 'Nearby Brokers Pinged',
            currentStageNumber: 2,
            totalStages: 3,
            progress: 67,
            nextAction: 'Track broker responses',
        };
    }

    return {
        currentStage: dispatchStatus === 'matching' ? 'Request Sent' : 'Nearby Brokers Pinged',
        currentStageNumber: dispatchStatus === 'matching' ? 1 : 2,
        totalStages: 3,
        progress: dispatchStatus === 'matching' ? 34 : 67,
        nextAction: 'Wait for broker responses',
    };
};
