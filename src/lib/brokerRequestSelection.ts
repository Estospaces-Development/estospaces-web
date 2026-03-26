import type { BrokerRequestRecord } from '@/services/leadsService';

const normalizeValue = (value?: string | null) => String(value || '').trim().toLowerCase();

const getRequestTimestamp = (request: BrokerRequestRecord) => {
    const candidate = request.created_at || request.dispatch_started_at || request.matched_at || request.updated_at;
    if (!candidate) {
        return 0;
    }

    const timestamp = new Date(candidate).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
};

const getRequestPriority = (request: BrokerRequestRecord) => {
    const status = normalizeValue(request.status);
    const dispatchStatus = normalizeValue(request.dispatch_status);
    const handoffStatus = normalizeValue(request.handoff_status);

    if (status === 'cancelled' || handoffStatus === 'archived') {
        return 0;
    }

    if (status === 'expired' || dispatchStatus === 'expired') {
        return 1;
    }

    return 2;
};

export const selectPrimaryBrokerRequest = (
    requests: BrokerRequestRecord[] | null | undefined,
    preferredRequestId?: string | null,
) => {
    if (!requests?.length) {
        return null;
    }

    const normalizedPreferredRequestId = normalizeValue(preferredRequestId);
    if (normalizedPreferredRequestId) {
        const explicitRequest = requests.find((request) => normalizeValue(request.id) === normalizedPreferredRequestId);
        if (explicitRequest) {
            return explicitRequest;
        }
    }

    return [...requests].sort((left, right) => {
        const priorityDelta = getRequestPriority(right) - getRequestPriority(left);
        if (priorityDelta !== 0) {
            return priorityDelta;
        }

        return getRequestTimestamp(right) - getRequestTimestamp(left);
    })[0] || null;
};
