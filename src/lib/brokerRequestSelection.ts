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

const compareBrokerRequests = (left: BrokerRequestRecord, right: BrokerRequestRecord) => {
    const priorityDelta = getRequestPriority(right) - getRequestPriority(left);
    if (priorityDelta !== 0) {
        return priorityDelta;
    }

    return getRequestTimestamp(right) - getRequestTimestamp(left);
};

export const sortBrokerRequestsByPriority = (
    requests: BrokerRequestRecord[] | null | undefined,
) => requests?.length
    ? [...requests].sort(compareBrokerRequests)
    : [];

export const shouldAutoResumeBrokerRequest = (
    request: BrokerRequestRecord,
) => {
    const status = normalizeValue(request.status);
    const dispatchStatus = normalizeValue(request.dispatch_status);
    const handoffStatus = normalizeValue(request.handoff_status);

    if (
        status === 'cancelled'
        || handoffStatus === 'cancelled'
        || handoffStatus === 'archived'
    ) {
        return false;
    }

    if (status === 'expired' || dispatchStatus === 'expired') {
        return false;
    }

    if (
        handoffStatus === 'property_selected'
        || Boolean(request.selected_property_id)
        || Boolean(request.selected_fast_track_case_id)
    ) {
        return false;
    }

    return true;
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

    return sortBrokerRequestsByPriority(requests)[0] || null;
};

export const selectPrimaryBrokerRequestBy = (
    requests: BrokerRequestRecord[] | null | undefined,
    predicate: (request: BrokerRequestRecord) => boolean,
    preferredRequestId?: string | null,
) => selectPrimaryBrokerRequest(
    requests?.filter(predicate) || [],
    preferredRequestId,
);

export const selectAutoResumeBrokerRequest = (
    requests: BrokerRequestRecord[] | null | undefined,
    preferredRequestId?: string | null,
) => selectPrimaryBrokerRequestBy(
    requests,
    shouldAutoResumeBrokerRequest,
    preferredRequestId,
);
