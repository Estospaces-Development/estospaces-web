import type { BrokerRequestRecord } from '@/services/leadsService';

export interface BrokerRequestTrackingSummary {
    currentStage: string;
    currentStageNumber: number;
    totalStages: number;
    progress: number;
    nextAction: string;
}

export type ActivityTimestampCandidate = Date | string | number | null | undefined;

export type TimelinePropertyContext = {
    title?: string;
    address?: string;
    price?: number;
    country?: string;
    currency?: string;
    image?: unknown;
};

export type MissingTimelinePropertyCopy = {
    title?: string;
    address?: string;
    priceLabel?: string;
};

export type TimelinePropertyContextInput = {
    title?: unknown;
    address?: unknown;
    price?: unknown;
    country?: unknown;
    currency?: unknown;
    image?: unknown;
};

const UNAVAILABLE_ACTIVITY_TIMESTAMP = 0;

const normalizeStatus = (value?: string | null) => String(value || '').trim().toLowerCase();
const CLOSED_REQUEST_STATUSES = new Set(['expired', 'cancelled', 'closed', 'resolved', 'archived', 'completed']);
const normalizeTimelineText = (value: unknown) => String(value || '').trim() || undefined;
const hasTimelineImage = (value: unknown) => {
    if (Array.isArray(value)) {
        return value.some((item) => normalizeTimelineText(item));
    }

    return Boolean(normalizeTimelineText(value));
};
const parseTimelinePrice = (value: unknown) => {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value > 0 ? value : undefined;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
        return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }

    return undefined;
};

export const parseActivityTimestamp = (...candidates: ActivityTimestampCandidate[]) => {
    for (const candidate of candidates) {
        if (candidate === null || candidate === undefined || candidate === '') {
            continue;
        }

        const date = candidate instanceof Date ? candidate : new Date(candidate);
        const timestamp = date.getTime();

        if (Number.isFinite(timestamp)) {
            return new Date(timestamp);
        }
    }

    return null;
};

export const getStableActivityTimestamp = (...candidates: ActivityTimestampCandidate[]) => (
    parseActivityTimestamp(...candidates) || new Date(UNAVAILABLE_ACTIVITY_TIMESTAMP)
);

export const hasStableActivityTimestamp = (date: Date | null | undefined) => (
    Boolean(date && Number.isFinite(date.getTime()) && date.getTime() > UNAVAILABLE_ACTIVITY_TIMESTAMP)
);

export const getApplicationTimelineTimestamp = (
    application: { created_at?: ActivityTimestampCandidate; submitted_at?: ActivityTimestampCandidate; updated_at?: ActivityTimestampCandidate },
) => getStableActivityTimestamp(application.created_at, application.submitted_at, application.updated_at);

export const hasTimelinePropertyDetails = (context: TimelinePropertyContextInput | null | undefined) => (
    Boolean(
        normalizeTimelineText(context?.address) ||
        parseTimelinePrice(context?.price) ||
        hasTimelineImage(context?.image),
    )
);

export const resolveTimelinePropertyContext = (
    primary: TimelinePropertyContextInput | null | undefined,
    fallback: TimelinePropertyContextInput | null | undefined,
): TimelinePropertyContext => ({
    title: normalizeTimelineText(primary?.title) || normalizeTimelineText(fallback?.title),
    address: normalizeTimelineText(primary?.address) || normalizeTimelineText(fallback?.address),
    price: parseTimelinePrice(primary?.price) ?? parseTimelinePrice(fallback?.price),
    country: normalizeTimelineText(primary?.country) || normalizeTimelineText(fallback?.country),
    currency: normalizeTimelineText(primary?.currency) || normalizeTimelineText(fallback?.currency),
    image: hasTimelineImage(primary?.image) ? primary?.image : fallback?.image,
});

export const getMissingTimelinePropertyCopy = (
    context: TimelinePropertyContextInput | null | undefined,
    propertyRecordUnavailable: boolean,
): MissingTimelinePropertyCopy => {
    if (!propertyRecordUnavailable) {
        return {};
    }

    return {
        title: normalizeTimelineText(context?.title) ? undefined : 'Archived property application',
        address: normalizeTimelineText(context?.address) ? undefined : 'Original listing no longer available',
        priceLabel: parseTimelinePrice(context?.price) ? undefined : 'Original price not captured',
    };
};

export const isLiveBrokerRequest = (
    request: Pick<BrokerRequestRecord, 'status' | 'dispatch_status'> | null | undefined,
) => {
    const status = normalizeStatus(request?.status);
    const dispatchStatus = normalizeStatus(request?.dispatch_status);

    return !CLOSED_REQUEST_STATUSES.has(status) && !CLOSED_REQUEST_STATUSES.has(dispatchStatus);
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
