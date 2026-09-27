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

export type RequestEntryJourneyState = 'active' | 'completed' | 'closed';

export interface RequestEntryJourneyDescription {
    state: RequestEntryJourneyState;
    actionLabel: string;
    summary: string;
    notice: string;
    /** Summary and notice as one sentence for compact surfaces. */
    text: string;
}

/**
 * Describes the case a request entry point leads to, whatever its status.
 * Only an active case (including a legacy "expired" one, which the booking
 * service still treats as active and continues) gets the existing-journey copy
 * and the "no new 24-hour clock" notice. Completed and cancelled/rejected
 * cases are described as finished, because a request keeps its
 * selected_fast_track_case_id after the case closes.
 */
export const describeRequestEntryJourney = (
    caseItem: JourneyCase,
    context: ExistingJourneyContext = {},
    now: number = Date.now(),
): RequestEntryJourneyDescription => {
    if (isActiveJourney(caseItem)) {
        const journey = describeExistingFastTrackJourney(caseItem, context, now);
        return {
            state: 'active',
            actionLabel: 'Continue existing 24-hour journey',
            summary: journey.summary,
            notice: journey.notice,
            text: `${journey.summary}. ${journey.notice}`,
        };
    }
    const completed = caseItem.workspaceFinalStatus === 'completed' || caseItem.finalStatus === 'completed';
    const statusLabel = completed ? 'Completed' : 'Closed';
    const summary = [formatJourneyStartedLabel(caseItem.submittedAt), statusLabel, describeJourneyLink(caseItem, context)]
        .filter(Boolean)
        .join(' · ');
    const notice = completed
        ? 'This 24-hour journey is complete.'
        : 'This 24-hour journey was closed and is no longer active.';
    return {
        state: completed ? 'completed' : 'closed',
        actionLabel: completed ? 'View completed 24-hour journey' : 'View closed 24-hour journey',
        summary,
        notice,
        text: `${summary}. ${notice}`,
    };
};

/**
 * State of the journey behind a selected home: no case yet, a linked case whose
 * status is still loading, or a described case (active / completed / closed).
 */
export type SelectedHomeJourneyState = 'none' | 'loading' | RequestEntryJourneyState;

export const resolveSelectedHomeJourneyState = ({
    linkedCaseId,
    entryJourney,
}: {
    linkedCaseId?: string | null;
    entryJourney?: Pick<RequestEntryJourneyDescription, 'state'> | null;
}): SelectedHomeJourneyState => {
    if (entryJourney) return entryJourney.state;
    return linkedCaseId ? 'loading' : 'none';
};

/** Selected-home card copy that never presents a finished journey as live. */
export const getSelectedHomeJourneyCopy = (state: SelectedHomeJourneyState, propertyTitle?: string | null) => {
    const home = propertyTitle?.trim() || 'Your chosen home';
    switch (state) {
        case 'completed':
            return {
                cardTitle: 'Your 24-hour journey for this home is complete',
                cardDescription: 'Open your chosen home or view the completed journey.',
                stepTitle: 'Journey complete',
                stepDescription: `The 24-hour journey for ${home === 'Your chosen home' ? 'your chosen home' : home} is complete.`,
            };
        case 'closed':
            return {
                cardTitle: 'Your 24-hour journey for this home was closed',
                cardDescription: 'Open your chosen home or view the closed journey. It is no longer active.',
                stepTitle: 'Journey closed',
                stepDescription: `The 24-hour journey for ${home === 'Your chosen home' ? 'your chosen home' : home} was closed and is no longer active.`,
            };
        case 'loading':
            return {
                cardTitle: 'Your chosen home',
                cardDescription: 'Open your chosen home or its linked 24-hour journey.',
                stepTitle: 'Home selected',
                stepDescription: `${home} is linked to a 24-hour journey.`,
            };
        case 'none':
            return {
                cardTitle: 'Your chosen home is ready',
                cardDescription: 'Open your chosen home to request your 24-hour journey.',
                stepTitle: 'Home selected',
                stepDescription: `${home} is ready for your 24-hour journey.`,
            };
        default:
            return {
                cardTitle: 'Your chosen home is ready',
                cardDescription: 'Open your chosen home or continue your existing 24-hour journey.',
                stepTitle: 'Home selected',
                stepDescription: propertyTitle?.trim()
                    ? `${propertyTitle.trim()} is ready for your 24-hour journey and all next steps continue there.`
                    : 'Your chosen home is ready for your 24-hour journey.',
            };
    }
};

export const resolveSelectedHomeFastTrackActionLabel = ({
    linkedCaseId,
    existingCase,
    entryJourney,
    hasSelectedProperty,
}: {
    linkedCaseId?: string | null;
    existingCase?: unknown;
    entryJourney?: Pick<RequestEntryJourneyDescription, 'actionLabel'> | null;
    hasSelectedProperty: boolean;
}) => {
    if (entryJourney) return entryJourney.actionLabel;
    // Linked case not loaded yet (or lookup failed): do not guess its status.
    if (linkedCaseId) return 'Open linked 24-hour journey';
    if (existingCase) return 'Continue existing 24-hour journey';
    if (hasSelectedProperty) return 'Request fast-track for selected home';
    return 'Open matched agent request';
};
