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
    | 'appointments'
    | 'applications'
    | 'contracts'
    | 'billing';

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

export const getPurchaseWorkspaceLabel = (linkedJourney?: Pick<FastTrackLinkedJourney, 'liveStage' | 'saleProgression'> | null) => {
    if (linkedJourney?.saleProgression) {
        return 'Open sale progression workspace';
    }

    if (linkedJourney?.liveStage === 'buyer_qualification') {
        return 'Open buyer qualification workspace';
    }

    if (linkedJourney?.liveStage === 'offer') {
        return 'Open offer workspace';
    }

    return 'Open purchase workspace';
};

const applicationsTitle = (journeyType: JourneyType, linkedJourney?: LinkedJourneyLike) => (
    linkedJourney?.primaryHeadline
    || (journeyType === 'buy' ? 'Proof of funds / MIP' : 'Referencing and compliance')
);

const applicationsDescription = (journeyType: JourneyType, linkedJourney?: LinkedJourneyLike) => (
    linkedJourney?.nextStep
    || (journeyType === 'buy'
        ? 'Open the purchase workspace to continue proof of funds, the MIP, and the live offer from the same fast-track case.'
        : 'Open the applications workspace to continue referencing, compliance checks, and approval from the same fast-track case.')
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
                    actionLabel: 'Open appointments workspace',
                    description: 'Open the appointments workspace to confirm, reschedule, or complete the live viewing from the same fast-track case.',
                    target: 'appointments',
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
                    actionLabel: 'Open appointments workspace',
                    description: linkedJourney.nextStep || 'Open the appointments workspace to confirm, reschedule, or complete the live viewing from the same fast-track case.',
                    target: 'appointments',
                }
                : {
                    title: 'Viewing scheduled',
                    description: 'The viewing is booked and the appointments workspace owns the next update.',
                    target: 'none',
                };
        case 'viewing_completed':
        case 'application_in_review':
            return {
                title: applicationsTitle(journeyType, linkedJourney),
                actionLabel: journeyType === 'buy' ? getPurchaseWorkspaceLabel(linkedJourney) : 'Open applications workspace',
                description: applicationsDescription(journeyType, linkedJourney),
                target: 'applications',
            };
        case 'ready_for_contract':
            if (journeyType === 'buy') {
                return {
                    title: applicationsTitle(journeyType, linkedJourney),
                    actionLabel: getPurchaseWorkspaceLabel(linkedJourney),
                    description: applicationsDescription(journeyType, linkedJourney),
                    target: 'applications',
                };
            }

            if (hasPendingFinanceTasks) {
                return {
                    title: linkedJourney?.primaryHeadline || 'Deposit and first-rent tasks',
                    actionLabel: 'Open billing workspace',
                    description: linkedJourney?.nextStep || 'Open the billing workspace to clear deposit or first-rent tasks and finish the move-in handoff.',
                    target: 'billing',
                };
            }

            return {
                title: linkedJourney?.primaryHeadline || 'Tenancy agreement and signatures',
                actionLabel: 'Open contracts workspace',
                description: linkedJourney?.nextStep || 'Open the contracts workspace to draft, issue, or complete the tenancy agreement from the same fast-track case.',
                target: 'contracts',
            };
        default:
            return null;
    }
};
