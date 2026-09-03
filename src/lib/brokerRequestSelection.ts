import type { BrokerRequestRecord } from '@/services/leadsService';

const normalizeValue = (value?: string | null) => String(value || '').trim().toLowerCase();
const CLOSED_AUTO_RESUME_STATUSES = new Set(['cancelled', 'closed', 'resolved', 'archived', 'completed']);

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

    if (CLOSED_AUTO_RESUME_STATUSES.has(status) || CLOSED_AUTO_RESUME_STATUSES.has(handoffStatus)) {
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

const normalizeSubmissionToken = (value?: string | null) => normalizeValue(value).replace(/\s+/g, ' ');
const normalizeCompactSubmissionToken = (value?: string | null) => normalizeSubmissionToken(value).replace(/\s+/g, '');

const isClosedBrokerRequest = (request: BrokerRequestRecord) => {
    const status = normalizeValue(request.status);
    const dispatchStatus = normalizeValue(request.dispatch_status);
    const handoffStatus = normalizeValue(request.handoff_status);
    return CLOSED_AUTO_RESUME_STATUSES.has(status)
        || CLOSED_AUTO_RESUME_STATUSES.has(dispatchStatus)
        || CLOSED_AUTO_RESUME_STATUSES.has(handoffStatus)
        || status === 'expired'
        || dispatchStatus === 'expired';
};

const getRequestSubmissionSignature = (request: BrokerRequestRecord) => {
    const requesterKey = normalizeSubmissionToken(request.user_id)
        || normalizeSubmissionToken(request.requester_email)
        || normalizeSubmissionToken(request.requester_phone);
    const requestDetails = [
        normalizeSubmissionToken(request.request_type),
        normalizeSubmissionToken(request.location),
        normalizeCompactSubmissionToken(request.location_postcode),
        normalizeSubmissionToken(request.budget),
        normalizeSubmissionToken(request.details),
    ];

    if (!requesterKey || requestDetails.every((item) => item === '')) {
        return '';
    }

    return [requesterKey, ...requestDetails].join('|');
};

const SUBMISSION_DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const submissionRequestsAreDuplicates = (
    candidate: BrokerRequestRecord,
    current: BrokerRequestRecord,
) => {
    if (isClosedBrokerRequest(candidate) !== isClosedBrokerRequest(current)) {
        return false;
    }

    const candidateTimestamp = getRequestTimestamp(candidate);
    const currentTimestamp = getRequestTimestamp(current);
    if (candidateTimestamp === 0 || currentTimestamp === 0) {
        return candidate.id === current.id;
    }

    return Math.abs(candidateTimestamp - currentTimestamp) <= SUBMISSION_DUPLICATE_WINDOW_MS;
};

const getSelectedPropertyWorkspaceSignature = (request: BrokerRequestRecord) => {
    const requesterKey = normalizeSubmissionToken(request.user_id)
        || normalizeSubmissionToken(request.requester_email)
        || normalizeSubmissionToken(request.requester_phone);
    const propertyKey = normalizeSubmissionToken(request.selected_property_id)
        || normalizeSubmissionToken(request.selected_property?.id);
    const managerKey = normalizeSubmissionToken(request.matched_broker_id);

    if (!requesterKey || !propertyKey) {
        return '';
    }

    return `selected-property|${requesterKey}|${managerKey}|${propertyKey}`;
};

const selectedPropertyRequestsAreDuplicates = (
    candidate: BrokerRequestRecord,
    current: BrokerRequestRecord,
) => {
    if (isClosedBrokerRequest(candidate) || isClosedBrokerRequest(current)) {
        return false;
    }

    const candidateCaseID = normalizeSubmissionToken(candidate.selected_fast_track_case_id);
    const currentCaseID = normalizeSubmissionToken(current.selected_fast_track_case_id);
    if (candidateCaseID && currentCaseID) {
        return candidateCaseID === currentCaseID;
    }

    return submissionRequestsAreDuplicates(candidate, current);
};

const getRequestProgressScore = (request: BrokerRequestRecord) => {
    if (request.selected_fast_track_case_id) {
        return 5;
    }
    if (request.selected_property_id || request.selected_fast_track_case_id || request.selected_property) {
        return 4;
    }
    if ((request.property_shares || []).length > 0 || normalizeValue(request.handoff_status) === 'portfolio_shared') {
        return 3;
    }
    if (request.matched_broker_id || normalizeValue(request.dispatch_status) === 'broker_matched' || normalizeValue(request.status) === 'matched') {
        return 2;
    }
    return 1;
};

const shouldReplaceDuplicateBrokerRequest = (
    candidate: BrokerRequestRecord,
    current: BrokerRequestRecord,
) => {
    const progressDelta = getRequestProgressScore(candidate) - getRequestProgressScore(current);
    if (progressDelta !== 0) {
        return progressDelta > 0;
    }

    return getRequestTimestamp(candidate) > getRequestTimestamp(current);
};

export const dedupeBrokerRequestsBySubmissionSignature = (
    requests: BrokerRequestRecord[] | null | undefined,
) => {
    if (!requests?.length) {
        return [];
    }

    const deduped: BrokerRequestRecord[] = [];
    const submissionIndexesBySignature = new Map<string, number[]>();
    const submissionAnchorByIndex = new Map<number, BrokerRequestRecord>();
    const selectedIndexesBySignature = new Map<string, number[]>();
    const selectedAnchorByIndex = new Map<number, BrokerRequestRecord>();

    const requestsBySubmissionTime = [...requests].sort(
        (left, right) => getRequestTimestamp(left) - getRequestTimestamp(right),
    );

    for (const request of requestsBySubmissionTime) {
        const selectedSignature = getSelectedPropertyWorkspaceSignature(request);
        if (selectedSignature) {
            const matchingIndex = (selectedIndexesBySignature.get(selectedSignature) || [])
                .find((index) => {
                    const current = deduped[index];
                    const currentCaseID = normalizeSubmissionToken(current.selected_fast_track_case_id);
                    const candidateCaseID = normalizeSubmissionToken(request.selected_fast_track_case_id);
                    const comparisonRequest = currentCaseID && candidateCaseID
                        ? current
                        : selectedAnchorByIndex.get(index) || current;

                    return selectedPropertyRequestsAreDuplicates(request, comparisonRequest);
                });
            if (matchingIndex === undefined) {
                const nextIndex = deduped.length;
                selectedIndexesBySignature.set(selectedSignature, [
                    ...(selectedIndexesBySignature.get(selectedSignature) || []),
                    nextIndex,
                ]);
                selectedAnchorByIndex.set(nextIndex, request);
                deduped.push(request);
            } else if (shouldReplaceDuplicateBrokerRequest(request, deduped[matchingIndex])) {
                deduped[matchingIndex] = request;
            }
            continue;
        }

        const signature = getRequestSubmissionSignature(request);
        if (!signature) {
            deduped.push(request);
            continue;
        }

        const existingIndex = (submissionIndexesBySignature.get(signature) || [])
            .find((index) => submissionRequestsAreDuplicates(
                request,
                submissionAnchorByIndex.get(index) || deduped[index],
            ));
        if (existingIndex === undefined) {
            const nextIndex = deduped.length;
            submissionIndexesBySignature.set(signature, [
                ...(submissionIndexesBySignature.get(signature) || []),
                nextIndex,
            ]);
            submissionAnchorByIndex.set(nextIndex, request);
            deduped.push(request);
            continue;
        }

        if (shouldReplaceDuplicateBrokerRequest(request, deduped[existingIndex])) {
            deduped[existingIndex] = request;
        }
    }

    return sortBrokerRequestsByPriority(deduped);
};

export const shouldAutoResumeBrokerRequest = (
    request: BrokerRequestRecord,
) => {
    const status = normalizeValue(request.status);
    const dispatchStatus = normalizeValue(request.dispatch_status);
    const handoffStatus = normalizeValue(request.handoff_status);

    if (
        CLOSED_AUTO_RESUME_STATUSES.has(status)
        || CLOSED_AUTO_RESUME_STATUSES.has(handoffStatus)
        || CLOSED_AUTO_RESUME_STATUSES.has(dispatchStatus)
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
