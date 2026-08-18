import type { BrokerRequestRecord } from '@/services/leadsService';
import { buildWorkspacePath } from '@/lib/workspaceLinks';
import { buildManagerFastTrackRequestPath } from '@/lib/managerFastTrackRequestNavigation';

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
        return 'Agent request sent';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatRequestTypeLabel = (value?: string) => {
    if (!value) {
        return 'Agent request';
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
            title: 'Agent request sent',
            subtitle: 'We are finding the nearest property agent now.',
            helper: 'Nearby property agents are being contacted for you.',
        };
    }

    const requestArea = formatRequestArea(request);

    if (request.handoff_status === 'property_selected' || request.selected_fast_track_case_id || request.selected_property_id) {
        return {
            title: 'Home selected',
            subtitle: request.selected_property?.title
                ? `${request.selected_property.title} is ready for your 24-hour journey`
                : 'Your chosen home is ready for the 24-hour journey.',
            helper: 'Continue with your chosen home.',
        };
    }

    if (request.handoff_status === 'portfolio_shared' || (request.property_shares?.length || 0) > 0) {
        return {
            title: 'Home choices ready',
            subtitle: `${request.property_shares?.length || 0} home choice${request.property_shares?.length === 1 ? '' : 's'} ready to review`,
            helper: 'Choose one home to start your 24-hour journey.',
        };
    }

    if (request.dispatch_status === 'broker_matched' || request.status === 'matched') {
        return {
            title: 'Agent found',
            subtitle: request.matched_broker?.name ? `Matched with ${request.matched_broker.name}` : 'A property agent accepted your request',
            helper: request.handoff_status === 'awaiting_portfolio'
                ? 'Your property agent is preparing home choices.'
                : 'Your property agent is reviewing your request.',
        };
    }

    if (request.dispatch_status === 'expired' || request.status === 'expired') {
        return {
            title: 'Request expired',
            subtitle: 'No property agent accepted in time',
            helper: 'Start another request to try again.',
        };
    }

    if (request.dispatch_status === 'unavailable') {
        return {
            title: 'Waiting for available property agents',
            subtitle: 'No verified property agents are available right now',
            helper: 'We keep checking nearby property agents during the response window.',
        };
    }

    return {
        title: 'Agent request sent',
        subtitle: requestArea
            ? `Searching property agents near ${requestArea}`
            : formatDispatchStatus(request.dispatch_status),
        helper: request.budget
            ? `Budget ${request.budget} is included in your request.`
            : 'Nearby property agents are being contacted for you.',
    };
};

export const getMatchedExperienceSteps = (request: BrokerRequestRecord): MatchedExperienceStep[] => {
    const brokerName = request.matched_broker?.name || 'Your broker';
    const requestTypeLabel = formatRequestTypeLabel(request.request_type).toLowerCase();
    const sharedCount = request.property_shares?.length || 0;
    const hasSelectedProperty = Boolean(request.selected_property_id || request.selected_fast_track_case_id || request.selected_property);

    let handoffTitle = request.fast_track_enabled ? 'Home choices are on the way' : 'Continue with your agent request';
    let handoffDescription = request.fast_track_enabled
        ? 'Your 24-hour journey starts after your property agent shares home choices and you pick one.'
        : 'Home choices, document requests, and next steps will continue in this agent request.';

    if (request.handoff_status === 'portfolio_shared' || sharedCount > 0) {
        handoffTitle = 'Home choices are ready';
        handoffDescription = `${sharedCount} home choice${sharedCount === 1 ? '' : 's'} ${sharedCount === 1 ? 'is' : 'are'} now ready for you to review and choose from.`;
    }

    if (hasSelectedProperty) {
        handoffTitle = 'Home selected';
        handoffDescription = request.selected_property?.title
            ? `${request.selected_property.title} is ready for your 24-hour journey and all next steps continue there.`
            : 'Your chosen home is ready for your 24-hour journey.';
    }

    return [
        {
            id: 'confirmed',
            title: 'Property agent confirmed',
            description: `${brokerName} accepted your ${requestTypeLabel} request and is now helping you.`,
        },
        {
            id: 'details',
            title: 'Your request details stay here',
            description: 'Your location, budget, and requirements stay attached so the property agent sees the same details you shared.',
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
        const selectedShare = request.property_shares?.find((share) => (
            share.status === 'selected' || share.property_id === request.selected_property_id
        ));
        const fastTrackCaseId = request.selected_fast_track_case_id || selectedShare?.fast_track_case_id;

        if (!fastTrackCaseId) {
            return {
                label: 'Start Fast Track workflow',
                path: buildManagerFastTrackRequestPath({
                    brokerRequestId: request.id,
                    leadId: request.selected_lead_id,
                    propertyId: request.selected_property_id,
                }),
            };
        }

        return {
            label: 'Open Fast Track workflow',
            path: buildWorkspacePath('/manager/fast-track', {
                caseId: fastTrackCaseId,
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

    // Pending offers/leads represent live client requests — always include them regardless of limit.
    const pendingItems = sorted.filter(
        (item) => item.trackerLane === 'offer_pending' || item.trackerLane === 'lead_pending',
    );
    const pendingIds = new Set(pendingItems.map((item) => item.id));

    // From non-pending items, prefer share_needed (up to 2) then fill remaining slots.
    const nonPending = sorted.filter((item) => !pendingIds.has(item.id));
    const topShareNeeded = nonPending
        .filter((item) => item.requestKind === 'offer' && item.trackerLane === 'share_needed')
        .slice(0, Math.min(limit, 2));
    const shareNeededIds = new Set(topShareNeeded.map((item) => item.id));
    const rest = nonPending.filter((item) => !shareNeededIds.has(item.id));

    const combined = [...pendingItems, ...topShareNeeded, ...rest];
    // Always show all pending items; apply limit only to the non-pending tail.
    const effectiveLimit = Math.max(limit, pendingItems.length);
    return combined.slice(0, effectiveLimit);
};

