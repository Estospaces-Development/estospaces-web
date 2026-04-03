import type { BrokerRequestRecord } from '@/services/leadsService';
import { buildWorkspacePath } from '@/lib/workspaceLinks';

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

export type ManagerWorkspaceAction = {
    label: string;
    path?: string;
};

export type ManagerTrackerLane =
    | 'offer_pending'
    | 'lead_pending'
    | 'share_needed'
    | 'shortlist_shared'
    | 'property_selected'
    | 'lead_responded'
    | 'expired';

export type ManagerTrackerItem = {
    id: string;
    requestKind: 'lead' | 'offer';
    status: 'pending' | 'responded' | 'expired';
    timestamp: Date;
    secondsRemaining?: number;
    trackerLane: ManagerTrackerLane;
};

const secondsUntilDeadline = (deadline?: string) => {
    if (!deadline) {
        return undefined;
    }

    const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
    return Number.isFinite(seconds) ? seconds : undefined;
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

export const formatWorkspaceReference = (requestId?: string) => {
    const trimmed = String(requestId || '').trim();
    if (!trimmed) {
        return 'Pending';
    }

    return trimmed.slice(0, 8).toUpperCase();
};

const formatRequestArea = (request: Pick<BrokerRequestRecord, 'location' | 'location_postcode'>) => {
    return [request.location, request.location_postcode].filter(Boolean).join(' - ');
};

export const getDispatchWorkspaceSummary = (request: BrokerRequestRecord | null): DispatchWorkspaceSummary => {
    if (!request) {
        return {
            title: 'Request sent',
            subtitle: 'Live dispatch started',
            helper: 'Ranked brokers are being notified in waves',
        };
    }

    const requestArea = formatRequestArea(request);

    if (request.handoff_status === 'property_selected' || request.selected_fast_track_case_id || request.selected_property_id) {
        return {
            title: 'Property selected',
            subtitle: request.selected_property?.title
                ? `${request.selected_property.title} is now linked to your live workspace`
                : 'A property has been selected for the 24-hour fast-track',
            helper: 'Continue in the selected property or fast-track workspace',
        };
    }

    if (request.handoff_status === 'portfolio_shared' || (request.property_shares?.length || 0) > 0) {
        return {
            title: 'Portfolio shared',
            subtitle: `${request.property_shares?.length || 0} property option${request.property_shares?.length === 1 ? '' : 's'} ready to review`,
            helper: 'Choose one property to start the 24-hour fast-track',
        };
    }

    if (request.dispatch_status === 'broker_matched' || request.status === 'matched') {
        return {
            title: 'Broker matched',
            subtitle: request.matched_broker?.name ? `Matched with ${request.matched_broker.name}` : 'A broker accepted your request',
            helper: request.handoff_status === 'awaiting_portfolio'
                ? 'Your broker is preparing a property shortlist'
                : 'Broker accepted your request',
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
        subtitle: requestArea
            ? `Searching brokers near ${requestArea}`
            : formatDispatchStatus(request.dispatch_status),
        helper: request.budget
            ? `Budget ${request.budget} is attached to this live brief`
            : 'Ranked brokers are being notified in waves',
    };
};

export const getMatchedExperienceSteps = (request: BrokerRequestRecord): MatchedExperienceStep[] => {
    const brokerName = request.matched_broker?.name || 'Your broker';
    const requestTypeLabel = formatRequestTypeLabel(request.request_type).toLowerCase();
    const sharedCount = request.property_shares?.length || 0;
    const hasSelectedProperty = Boolean(request.selected_property_id || request.selected_fast_track_case_id || request.selected_property);

    let handoffTitle = request.fast_track_enabled ? 'Broker is preparing options' : 'Continue in the broker workspace';
    let handoffDescription = request.fast_track_enabled
        ? 'The 24-hour property fast-track starts only after your broker shares property options and you choose one.'
        : 'Property options, document requests, and next actions will continue from the same broker workspace.';

    if (request.handoff_status === 'portfolio_shared' || sharedCount > 0) {
        handoffTitle = 'Property options are ready';
        handoffDescription = `${sharedCount} shortlisted propert${sharedCount === 1 ? 'y is' : 'ies are'} now available in this workspace for you to review and choose from.`;
    }

    if (hasSelectedProperty) {
        handoffTitle = 'Property selected';
        handoffDescription = request.selected_property?.title
            ? `${request.selected_property.title} is now linked to your live fast-track and all next actions continue from that property workspace.`
            : 'Your selected property is now linked to the live fast-track workspace.';
    }

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
            id: 'handoff',
            title: handoffTitle,
            description: handoffDescription,
        },
    ];
};

export const getManagerWorkspaceAction = (request: BrokerRequestRecord): ManagerWorkspaceAction => {
    if (request.handoff_status === 'property_selected' || request.selected_fast_track_case_id || request.selected_property_id) {
        if (request.selected_fast_track_case_id) {
            return {
                label: 'Open property workflow',
                path: buildWorkspacePath('/manager/fast-track', {
                    caseId: request.selected_fast_track_case_id,
                    leadId: request.selected_lead_id,
                    propertyId: request.selected_property_id,
                }),
            };
        }

        return {
            label: 'Open lead workflow',
            path: buildWorkspacePath('/manager/leads', {
                leadId: request.selected_lead_id,
                propertyId: request.selected_property_id,
            }),
        };
    }

    if (request.handoff_status === 'portfolio_shared' || (request.property_shares?.length || 0) > 0) {
        return {
            label: 'Update shared shortlist',
        };
    }

    if (request.dispatch_status === 'broker_matched' || request.status === 'matched') {
        return {
            label: 'Share property shortlist',
        };
    }

    return {
        label: 'Open matched workspace',
    };
};

export const getManagerWorkspaceStateLabel = (request: BrokerRequestRecord) => {
    if (request.handoff_status === 'property_selected' || request.selected_fast_track_case_id || request.selected_property_id) {
        return 'Property selected';
    }

    if (request.handoff_status === 'portfolio_shared' || (request.property_shares?.length || 0) > 0) {
        return 'Shortlist shared';
    }

    if (request.handoff_status === 'awaiting_portfolio' || request.dispatch_status === 'broker_matched' || request.status === 'matched') {
        return 'Share needed';
    }

    return 'Live workspace';
};

export const getManagerTrackerResponseCountdown = (
    request: Pick<BrokerRequestRecord, 'dispatch_status' | 'status' | 'response_deadline_at'>,
) => {
    if (request.dispatch_status === 'broker_matched' || request.status === 'matched') {
        return undefined;
    }

    return secondsUntilDeadline(request.response_deadline_at);
};

const MANAGER_TRACKER_LANE_PRIORITY: Record<ManagerTrackerLane, number> = {
    offer_pending: 7,
    lead_pending: 6,
    share_needed: 5,
    shortlist_shared: 4,
    property_selected: 3,
    lead_responded: 2,
    expired: 1,
};

export const sortManagerTrackerItems = <T extends ManagerTrackerItem>(items: T[]) => [...items].sort((left, right) => {
    const priorityDelta = MANAGER_TRACKER_LANE_PRIORITY[right.trackerLane] - MANAGER_TRACKER_LANE_PRIORITY[left.trackerLane];
    if (priorityDelta !== 0) {
        return priorityDelta;
    }

    if (left.status === 'pending' && right.status !== 'pending') return -1;
    if (left.status !== 'pending' && right.status === 'pending') return 1;

    const leftSeconds = typeof left.secondsRemaining === 'number' ? left.secondsRemaining : Number.MAX_SAFE_INTEGER;
    const rightSeconds = typeof right.secondsRemaining === 'number' ? right.secondsRemaining : Number.MAX_SAFE_INTEGER;
    if (leftSeconds !== rightSeconds) {
        return leftSeconds - rightSeconds;
    }

    return right.timestamp.getTime() - left.timestamp.getTime();
});

export const selectManagerTrackerItems = <T extends ManagerTrackerItem>(items: T[], limit = 4) => {
    if (limit <= 0) {
        return [];
    }

    const sorted = sortManagerTrackerItems(items);
    const topShareNeeded = sorted
        .filter((item) => item.requestKind === 'offer' && item.trackerLane === 'share_needed')
        .slice(0, Math.min(limit, 2));
    const selectedIds = new Set(topShareNeeded.map((item) => item.id));
    const remaining = sorted.filter((item) => !selectedIds.has(item.id));

    return [...topShareNeeded, ...remaining].slice(0, limit);
};
