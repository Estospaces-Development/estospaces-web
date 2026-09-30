import { resolvePlanLimitNotice, type EntitlementLoader } from '@/lib/planLimit';
import type { ManagerFastTrackRequestContext } from '@/lib/managerFastTrackRequestNavigation';
import type { FastTrackCase } from '@/services/fastTrackService';
import type { Lead } from '@/services/leadsService';

type StartCase = Pick<FastTrackCase, 'finalStatus' | 'propertyId' | 'clientId' | 'leadId' | 'brokerRequestId'>;
type StartLead = Pick<Lead, 'id' | 'broker_request_id' | 'user_id' | 'property_id'>;

/**
 * The booking service reuses any case that is still in progress for the same
 * client and property, including overdue ones, instead of starting a new 24h
 * clock. The chooser must treat those cases as existing, not "Ready to start".
 */
export const isReusableFastTrackCase = (caseItem: Pick<FastTrackCase, 'finalStatus'>) => (
    caseItem.finalStatus === 'in_progress'
);

export const hasManagerFastTrackRequestContext = (context?: ManagerFastTrackRequestContext | null): context is ManagerFastTrackRequestContext => Boolean(
    context && (context.brokerRequestId || context.leadId || context.clientId || context.propertyId),
);

export type RequestContextCaseMatch = 'broker_request' | 'lead' | 'client_property';

/** Finds the active case that a dashboard or notification shortcut refers to, and how it matched. */
export const findRequestContextCaseMatch = <T extends StartCase>(
    cases: T[],
    context?: ManagerFastTrackRequestContext | null,
): { caseItem: T; matchedBy: RequestContextCaseMatch } | null => {
    if (!hasManagerFastTrackRequestContext(context)) return null;
    const active = cases.filter(isReusableFastTrackCase);
    const byBrokerRequest = context.brokerRequestId
        ? active.find((caseItem) => caseItem.brokerRequestId === context.brokerRequestId)
        : undefined;
    if (byBrokerRequest) return { caseItem: byBrokerRequest, matchedBy: 'broker_request' };
    const byLead = context.leadId
        ? active.find((caseItem) => caseItem.leadId === context.leadId)
        : undefined;
    if (byLead) return { caseItem: byLead, matchedBy: 'lead' };
    // Same key the booking service uses to reuse a case.
    if (context.clientId && context.propertyId) {
        const byPair = active.find((caseItem) => (
            caseItem.clientId === context.clientId && caseItem.propertyId === context.propertyId
        ));
        if (byPair) return { caseItem: byPair, matchedBy: 'client_property' };
    }
    return null;
};

export const findRequestContextCase = <T extends StartCase>(
    cases: T[],
    context?: ManagerFastTrackRequestContext | null,
): T | null => findRequestContextCaseMatch(cases, context)?.caseItem || null;

/**
 * Banner heading for a resolved shortcut case. A client+property match is not
 * proof the case belongs to this request, so it is described as the client's
 * existing case for the property instead.
 */
export const getRequestContextCaseHeading = (matchedBy: RequestContextCaseMatch) => {
    switch (matchedBy) {
        case 'broker_request':
            return 'This request already has an active 24-hour case';
        case 'lead':
            return 'This lead already has an active 24-hour case';
        default:
            return 'This client already has an active 24-hour case for this property';
    }
};

export const leadMatchesRequestContext = (
    lead: StartLead,
    context?: ManagerFastTrackRequestContext | null,
): boolean => {
    if (!hasManagerFastTrackRequestContext(context)) return true;
    if (context.leadId && lead.id === context.leadId) return true;
    if (context.brokerRequestId && lead.broker_request_id === context.brokerRequestId) return true;
    if (context.clientId && context.propertyId) {
        return lead.user_id === context.clientId && lead.property_id === context.propertyId;
    }
    if (context.clientId && !context.brokerRequestId && !context.leadId) {
        return lead.user_id === context.clientId;
    }
    if (context.propertyId && !context.brokerRequestId && !context.leadId) {
        return lead.property_id === context.propertyId;
    }
    return false;
};

export const getFastTrackStartSuccessMessage = ({
    reused,
    requestedLeadId,
}: {
    reused: boolean;
    requestedLeadId?: string;
}) => {
    if (!reused) return '24-hour fast-track case created successfully.';
    const base = 'Opened existing Fast Track case for this client and property. No new 24-hour case was created.';
    return requestedLeadId ? `${base} It stays linked to its original lead.` : base;
};

/** An error from starting a case, shown inside the modal that started it. */
export interface FastTrackStartNotice {
    title?: string;
    message: string;
    action?: { label: string; href: string };
}

const FAST_TRACK_START_FALLBACK_ERROR = 'Unable to create the 24-hour fast-track case.';

/**
 * Turns a failed start into the notice shown inside the "Add 24h Fast Track"
 * modal. The modal stays open on failure, so a global toast would sit behind
 * its backdrop and only appear once the manager is back on the dashboard.
 */
export async function resolveFastTrackStartNotice(
    error: unknown,
    loadEntitlement?: EntitlementLoader,
): Promise<FastTrackStartNotice> {
    const planLimit = await resolvePlanLimitNotice(error, loadEntitlement);
    if (planLimit) {
        return { title: planLimit.title, message: planLimit.message, action: planLimit.action };
    }
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
    if (message.toLowerCase().includes('too many requests')) {
        return { message: 'The fast-track queue is still refreshing. Please wait a moment and try again.' };
    }
    return { message: message.trim() || FAST_TRACK_START_FALLBACK_ERROR };
}
