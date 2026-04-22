import type { FastTrackStep } from '@/services/fastTrackService';

import type { FastTrackLinkedJourney } from './fastTrackLinkedJourney';

type JourneyType = 'rent' | 'buy' | undefined;

type LinkedJourneyLike = Pick<
    FastTrackLinkedJourney,
    'contract' | 'invoices' | 'liveStage' | 'nextStep' | 'payments' | 'primaryHeadline' | 'saleProgression' | 'viewing'
> | null | undefined;

type FinanceTask = {
    payment_type?: string | null;
    status?: string | null;
};

export type FastTrackStageGuidanceTarget =
    | 'none'
    | 'schedule_viewing'
    | 'fast_track';

const CONTINUE_IN_FAST_TRACK_LABEL = 'Continue in fast-track workspace';

export interface FastTrackStageGuidance {
    title: string;
    description: string;
    actionLabel?: string;
    target: FastTrackStageGuidanceTarget;
}

const isPendingPaymentTask = (item: FinanceTask) => {
    const type = String(item.payment_type || '').toLowerCase();
    const status = String(item.status || '').toLowerCase();
    return (type.includes('deposit') || type.includes('rent')) && ['pending', 'failed'].includes(status);
};

const isPendingInvoiceTask = (item: FinanceTask) => {
    const type = String(item.payment_type || '').toLowerCase();
    const status = String(item.status || '').toLowerCase();
    return (type.includes('deposit') || type.includes('rent')) && ['draft', 'open', 'uncollectible'].includes(status);
};

export const hasPendingRentFinanceTasks = (linkedJourney?: LinkedJourneyLike) => (
    (linkedJourney?.payments || []).some(isPendingPaymentTask)
    || (linkedJourney?.invoices || []).some(isPendingInvoiceTask)
);

export const getPurchaseWorkspaceLabel = (_linkedJourney?: Pick<FastTrackLinkedJourney, 'liveStage' | 'saleProgression'> | null) => 'Open linked purchase details';

const applicationsTitle = (journeyType: JourneyType, linkedJourney?: LinkedJourneyLike) => (
    linkedJourney?.primaryHeadline
    || (journeyType === 'buy' ? 'Proof of funds / MIP' : 'Referencing and compliance')
);

const applicationsDescription = (journeyType: JourneyType, linkedJourney?: LinkedJourneyLike) => (
    linkedJourney?.primaryHeadline
    || (journeyType === 'buy'
        ? 'Keep proof of funds, offer review, and sale progression in the same fast-track case. Purchase records stay synced there.'
        : 'Keep referencing, approval, and agreement prep in the same fast-track case. Companion application pages stay synced if you open them later.')
);

export const resolveFastTrackStageGuidance = ({
    currentStep,
    journeyType,
    linkedJourney,
    canScheduleViewing = false,
    hasPendingFinanceTasks = false,
}: {
    currentStep: FastTrackStep;
    journeyType?: JourneyType;
    linkedJourney?: LinkedJourneyLike;
    canScheduleViewing?: boolean;
    hasPendingFinanceTasks?: boolean;
}): FastTrackStageGuidance | null => {
    switch (currentStep) {
        case 'documents_verified':
            if (linkedJourney?.viewing) {
                return {
                    title: 'Documents verified',
                    actionLabel: CONTINUE_IN_FAST_TRACK_LABEL,
                    description: 'The viewing record is linked. Confirm, reschedule, or complete it from this fast-track case without jumping into a separate workflow screen.',
                    target: 'fast_track',
                };
            }

            if (canScheduleViewing) {
                return {
                    title: 'Documents verified',
                    actionLabel: 'Schedule viewing',
                    description: 'Verification is complete. Schedule the viewing now so the case moves into the next live workflow stage without leaving fast-track.',
                    target: 'schedule_viewing',
                };
            }

            return {
                title: 'Documents verified',
                description: 'Verification is complete. The case is ready for the next live workflow handoff.',
                target: 'none',
            };
        case 'viewing_scheduled':
            return linkedJourney?.viewing
                ? {
                    title: 'Viewing scheduled',
                    actionLabel: CONTINUE_IN_FAST_TRACK_LABEL,
                    description: linkedJourney.nextStep || 'The viewing is booked. Confirm, reschedule, or complete it from this fast-track case.',
                    target: 'fast_track',
                }
                : {
                    title: 'Viewing scheduled',
                    description: 'The viewing is booked and the next update stays in this fast-track case.',
                    target: 'none',
                };
        case 'viewing_completed':
        case 'application_in_review':
            return {
                title: applicationsTitle(journeyType, linkedJourney),
                actionLabel: CONTINUE_IN_FAST_TRACK_LABEL,
                description: applicationsDescription(journeyType, linkedJourney),
                target: 'fast_track',
            };
        case 'ready_for_contract':
            if (journeyType === 'buy') {
                return {
                    title: applicationsTitle(journeyType, linkedJourney),
                    actionLabel: CONTINUE_IN_FAST_TRACK_LABEL,
                    description: applicationsDescription(journeyType, linkedJourney),
                    target: 'fast_track',
                };
            }

            if (hasPendingFinanceTasks) {
                return {
                    title: linkedJourney?.primaryHeadline || 'Deposit and first-rent tasks',
                    actionLabel: CONTINUE_IN_FAST_TRACK_LABEL,
                    description: linkedJourney?.nextStep || 'Agreement, payment, and handover stay inside the same fast-track case until move-in is complete.',
                    target: 'fast_track',
                };
            }

            return {
                title: linkedJourney?.primaryHeadline || 'Tenancy agreement and signatures',
                actionLabel: CONTINUE_IN_FAST_TRACK_LABEL,
                description: linkedJourney?.nextStep || 'Draft, issue, and complete the tenancy agreement from this fast-track case.',
                target: 'fast_track',
            };
        default:
            return null;
    }
};
