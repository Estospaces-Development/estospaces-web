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

/** Finds the active case that a dashboard or notification shortcut refers to. */
export const findRequestContextCase = <T extends StartCase>(
    cases: T[],
    context?: ManagerFastTrackRequestContext | null,
): T | null => {
    if (!hasManagerFastTrackRequestContext(context)) return null;
    const active = cases.filter(isReusableFastTrackCase);
    const byBrokerRequest = context.brokerRequestId
        ? active.find((caseItem) => caseItem.brokerRequestId === context.brokerRequestId)
        : undefined;
    if (byBrokerRequest) return byBrokerRequest;
    const byLead = context.leadId
        ? active.find((caseItem) => caseItem.leadId === context.leadId)
        : undefined;
    if (byLead) return byLead;
    // Same key the booking service uses to reuse a case.
    if (context.clientId && context.propertyId) {
        return active.find((caseItem) => (
            caseItem.clientId === context.clientId && caseItem.propertyId === context.propertyId
        )) || null;
    }
    return null;
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
