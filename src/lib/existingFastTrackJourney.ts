import type { FastTrackCase } from '@/services/fastTrackService';

type JourneyCase = Pick<
    FastTrackCase,
    'caseId' | 'stage' | 'journeyMode' | 'submittedAt' | 'expiresAt' | 'hoursRemaining' | 'overdue'
    | 'workspaceFinalStatus' | 'finalStatus' | 'brokerRequestId' | 'leadId' | 'propertyId'
>;

export interface ExistingJourneyContext {
    /** Agent request the user came from, when the entry point knows it. */
    brokerRequestId?: string;
    /** Lead the entry point refers to, when known. */
    leadId?: string;
}

export interface ExistingFastTrackJourneySummary {
    heading: string;
    startedLabel: string | null;
    stageLabel: string;
    overdue: boolean;
    timingLabel: string;
    linkLabel: string | null;
    notice: string;
    summary: string;
}

const STAGE_LABELS: Record<string, string> = {
    selected: 'Home selected',
    documents: 'Documents',
    viewing: 'Viewing',
    decision: 'Decision',
    agreement: 'Agreement',
    handover: 'Handover',
};

const isActiveJourney = (caseItem: Pick<JourneyCase, 'workspaceFinalStatus' | 'finalStatus'>) => (
    caseItem.workspaceFinalStatus === 'active' || caseItem.finalStatus === 'in_progress'
);

export const formatJourneyStartedLabel = (submittedAt?: string): string | null => {
    const time = Date.parse(submittedAt || '');
    if (!Number.isFinite(time)) return null;
    const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(time));
    return `Started ${date}`;
};

export const isExistingJourneyOverdue = (caseItem: JourneyCase, now: number = Date.now()): boolean => {
    if (!isActiveJourney(caseItem)) return false;
    if (caseItem.overdue) return true;
    const expiresAt = Date.parse(caseItem.expiresAt || '');
    return Number.isFinite(expiresAt) && expiresAt <= now;
};

const describeJourneyLink = (caseItem: JourneyCase, context: ExistingJourneyContext): string | null => {
    if (context.brokerRequestId) {
        return caseItem.brokerRequestId === context.brokerRequestId
            ? 'Linked to this agent request'
            : 'Started separately from this agent request';
    }
    if (context.leadId && caseItem.leadId && caseItem.leadId !== context.leadId) {
        return 'Linked to an earlier enquiry';
    }
    if (caseItem.brokerRequestId) {
        return 'Linked to your agent request';
    }
    return null;
};

/**
 * Describes an existing Fast Track case for the user entry points. The booking
 * service reuses the single active case for a client and property, so every
 * Continue/Request surface must say it is the existing journey and never imply
 * that a new 24-hour clock started.
 */
export const describeExistingFastTrackJourney = (
    caseItem: JourneyCase,
    context: ExistingJourneyContext = {},
    now: number = Date.now(),
): ExistingFastTrackJourneySummary => {
    const overdue = isExistingJourneyOverdue(caseItem, now);
    const stageLabel = caseItem.stage === 'decision' && caseItem.journeyMode === 'sale'
        ? 'Offer'
        : STAGE_LABELS[caseItem.stage] || 'In progress';
    const timingLabel = overdue
        ? 'Deadline passed'
        : caseItem.hoursRemaining > 0
            ? `${caseItem.hoursRemaining}h left`
            : 'In progress';
    const startedLabel = formatJourneyStartedLabel(caseItem.submittedAt);
    const linkLabel = describeJourneyLink(caseItem, context);
    const notice = overdue
        ? 'This is your existing journey for this home. Its 24-hour deadline has passed and no new 24-hour clock has started.'
        : 'This is your existing journey for this home. No new 24-hour clock has started.';

    return {
        heading: 'Your existing 24-hour journey',
        startedLabel,
        stageLabel,
        overdue,
        timingLabel,
        linkLabel,
        notice,
        summary: [startedLabel, `${stageLabel} stage`, timingLabel, linkLabel].filter(Boolean).join(' · '),
    };
};

/** Active case for the property the user selected, if any. */
export const findActiveJourneyForProperty = <T extends Pick<JourneyCase, 'propertyId' | 'workspaceFinalStatus' | 'finalStatus'>>(
    cases: T[],
    propertyId?: string | null,
): T | null => {
    if (!propertyId) return null;
    return cases.find((caseItem) => caseItem.propertyId === propertyId && isActiveJourney(caseItem)) || null;
};

/**
 * Case a request entry point leads to: the case linked to the request when
 * there is one (it may be an older case the service reused), otherwise the
 * user's active case for the selected home.
 */
export const findRequestEntryJourney = <T extends Pick<JourneyCase, 'caseId' | 'propertyId' | 'workspaceFinalStatus' | 'finalStatus'>>(
    cases: T[],
    { linkedCaseId, propertyId }: { linkedCaseId?: string | null; propertyId?: string | null },
): T | null => {
    if (linkedCaseId) {
        return cases.find((caseItem) => caseItem.caseId === linkedCaseId) || null;
    }
    return findActiveJourneyForProperty(cases, propertyId);
};

export const resolveSelectedHomeFastTrackActionLabel = ({
    linkedCaseId,
    existingCase,
    hasSelectedProperty,
}: {
    linkedCaseId?: string | null;
    existingCase?: unknown;
    hasSelectedProperty: boolean;
}) => {
    // A linked case is always an existing journey, possibly an older reused one.
    if (linkedCaseId || existingCase) return 'Continue existing 24-hour journey';
    if (hasSelectedProperty) return 'Request fast-track for selected home';
    return 'Open matched agent request';
};
