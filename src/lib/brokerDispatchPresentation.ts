import type { BrokerRequestRecord } from '@/services/leadsService';

export type DispatchWorkspaceSummary = {
    title: string;
    subtitle: string;
    helper: string;
};

export type MatchedExperienceStep = {
    id: string;
    title: string;
    description: string;
};

export const formatDispatchStatus = (value?: string) => {
    if (!value) {
        return 'Live dispatch started';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatRequestTypeLabel = (value?: string) => {
    if (!value) {
        return 'Broker request';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const getDispatchWorkspaceSummary = (request: BrokerRequestRecord | null): DispatchWorkspaceSummary => {
    if (!request) {
        return {
            title: 'Request sent',
            subtitle: 'Live dispatch started',
            helper: 'Ranked brokers are being notified in waves',
        };
    }

    if (request.dispatch_status === 'broker_matched' || request.status === 'matched') {
        return {
            title: 'Broker matched',
            subtitle: request.matched_broker?.name ? `Matched with ${request.matched_broker.name}` : 'A broker accepted your request',
            helper: 'Broker accepted your request',
        };
    }

    if (request.dispatch_status === 'expired' || request.status === 'expired') {
        return {
            title: 'Dispatch expired',
            subtitle: 'No broker accepted in time',
            helper: 'Start another request to restart matching',
        };
    }

    if (request.dispatch_status === 'unavailable') {
        return {
            title: 'Waiting for eligible brokers',
            subtitle: 'No verified brokers are available right now',
            helper: 'We keep checking during the 10-minute response window',
        };
    }

    return {
        title: 'Request sent',
        subtitle: formatDispatchStatus(request.dispatch_status),
        helper: 'Ranked brokers are being notified in waves',
    };
};

export const getMatchedExperienceSteps = (request: BrokerRequestRecord): MatchedExperienceStep[] => {
    const brokerName = request.matched_broker?.name || 'Your broker';
    const requestTypeLabel = formatRequestTypeLabel(request.request_type).toLowerCase();
    const workspaceLabel = request.fast_track_enabled ? 'fast-track workspace' : 'live workspace';

    return [
        {
            id: 'confirmed',
            title: 'Broker confirmed',
            description: `${brokerName} accepted your ${requestTypeLabel} request and the live dispatch queue is now locked.`,
        },
        {
            id: 'details',
            title: 'Request details stay attached',
            description: 'Your location, budget, and requirements remain in this workspace so the matched broker sees the same brief you submitted.',
        },
        {
            id: 'next',
            title: `Follow the ${workspaceLabel}`,
            description: 'Any document request, live update, or next action will continue from the same active case flow.',
        },
    ];
};
