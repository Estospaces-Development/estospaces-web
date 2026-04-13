import type { JourneyBlocker } from '@/types/journey';
import { resolveManagerWorkflowErrorPresentation } from '@/lib/apiUtils';

export type ManagerWorkflowActionId =
    | 'cancel_viewing'
    | 'complete_viewing'
    | 'confirm_viewing'
    | 'create_contract'
    | 'progress_sale'
    | 'record_offer'
    | 'reschedule_viewing'
    | 'schedule_viewing';

export type ManagerWorkflowGuardTarget =
    | 'aml'
    | 'applications'
    | 'appointments'
    | 'approval'
    | 'buyer'
    | 'documents'
    | 'offer'
    | 'property_readiness'
    | 'seller';

export interface ManagerWorkflowActionGuard {
    action: ManagerWorkflowActionId;
    status: 'ready' | 'blocked' | 'unavailable';
    canRun: boolean;
    title: string;
    description: string;
    actionLabel?: string;
    target?: ManagerWorkflowGuardTarget;
}

type WorkflowGuardOptions = {
    action: ManagerWorkflowActionId;
    blockers?: JourneyBlocker[] | null;
    fallbackTitle: string;
    target?: ManagerWorkflowGuardTarget;
};

type ViewingAction = Extract<
    ManagerWorkflowActionId,
    'cancel_viewing' | 'complete_viewing' | 'confirm_viewing' | 'reschedule_viewing' | 'schedule_viewing'
>;

const readyGuard = (
    action: ManagerWorkflowActionId,
    title: string,
    description: string,
): ManagerWorkflowActionGuard => ({
    action,
    status: 'ready',
    canRun: true,
    title,
    description,
});

const blockedGuard = (
    action: ManagerWorkflowActionId,
    title: string,
    description: string,
    target?: ManagerWorkflowGuardTarget,
    actionLabel?: string,
): ManagerWorkflowActionGuard => ({
    action,
    status: 'blocked',
    canRun: false,
    title,
    description,
    target,
    actionLabel,
});

const unavailableGuard = (
    action: ManagerWorkflowActionId,
    title: string,
    description: string,
    target?: ManagerWorkflowGuardTarget,
    actionLabel?: string,
): ManagerWorkflowActionGuard => ({
    action,
    status: 'unavailable',
    canRun: false,
    title,
    description,
    target,
    actionLabel,
});

const normalizeText = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

const resolveBlockerWorkflowError = (
    blockers: JourneyBlocker[] | null | undefined,
    matcher: (blocker: JourneyBlocker) => boolean,
) => {
    for (const blocker of blockers || []) {
        if (!matcher(blocker)) {
            continue;
        }

        const presentation = resolveManagerWorkflowErrorPresentation(
            blocker.description || blocker.title || '',
        ) || resolveManagerWorkflowErrorPresentation(blocker.title || '');
        if (presentation) {
            return {
                title: presentation.title,
                description: blocker.description || presentation.message,
            };
        }
    }

    return null;
};

const resolveWorkflowUnavailableGuard = ({
    action,
    blockers,
    fallbackTitle,
    target,
}: WorkflowGuardOptions) => {
    const exactMatch = resolveBlockerWorkflowError(blockers, (blocker) => (
        normalizeText(blocker.title).includes(normalizeText(fallbackTitle))
        || normalizeText(blocker.description).includes(normalizeText(fallbackTitle))
    ));
    if (exactMatch) {
        return unavailableGuard(action, exactMatch.title, exactMatch.description, target);
    }

    const genericMatch = resolveBlockerWorkflowError(blockers, (blocker) => (
        resolveManagerWorkflowErrorPresentation(blocker.description || blocker.title || '') !== null
    ));
    if (genericMatch) {
        return unavailableGuard(action, genericMatch.title, genericMatch.description, target);
    }

    return null;
};

const viewingStatusLabel = (status: string | null | undefined) => {
    switch (normalizeText(status)) {
        case 'pending':
            return 'pending';
        case 'confirmed':
            return 'confirmed';
        case 'rescheduled':
            return 'rescheduled';
        case 'completed':
            return 'completed';
        case 'cancelled':
            return 'cancelled';
        default:
            return 'not linked';
    }
};

export function getManagerViewingActionGuard(input: {
    action: ViewingAction;
    documentsVerified: boolean;
    hasViewing: boolean;
    viewingLocked?: boolean;
    viewingLockReason?: string | null;
    viewingStatus?: string | null;
    isClosed?: boolean;
    isRefreshing?: boolean;
    blockers?: JourneyBlocker[] | null;
}): ManagerWorkflowActionGuard {
    const {
        action,
        blockers,
        documentsVerified,
        hasViewing,
        isClosed = false,
        isRefreshing = false,
        viewingLockReason,
        viewingLocked = false,
        viewingStatus,
    } = input;

    if (isRefreshing) {
        return unavailableGuard(
            action,
            'Viewing workflow is refreshing',
            'Wait for the latest linked viewing data before changing this case.',
            'appointments',
            'Open appointments',
        );
    }

    const unavailable = resolveWorkflowUnavailableGuard({
        action,
        blockers,
        fallbackTitle: 'Viewing workflow unavailable',
        target: 'appointments',
    });
    if (unavailable) {
        return unavailable;
    }

    if (isClosed) {
        return blockedGuard(
            action,
            'This fast-track case is closed',
            'Viewing updates are disabled once the fast-track case is completed, expired, or rejected.',
        );
    }

    if (action === 'schedule_viewing') {
        if (hasViewing) {
            return blockedGuard(
                action,
                'A viewing is already linked',
                'Open the appointments workspace to confirm, reschedule, or complete the current viewing.',
                'appointments',
                'Open appointments',
            );
        }
        if (!documentsVerified) {
            return blockedGuard(
                action,
                'Documents still need review',
                'Verify the fast-track documents before scheduling the live viewing.',
                'documents',
                'Review documents',
            );
        }

        return readyGuard(action, 'Schedule viewing', 'The fast-track case is ready for the live appointment.');
    }

    if (!hasViewing) {
        return blockedGuard(
            action,
            'No live viewing is linked yet',
            'Create the appointment first before trying to manage the viewing from fast-track.',
            'appointments',
            'Open appointments',
        );
    }

    if (viewingLocked) {
        return blockedGuard(
            action,
            'Viewing changes are locked',
            viewingLockReason || 'Open the appointments workspace to review the current viewing state.',
            'appointments',
            'Open appointments',
        );
    }

    const normalizedStatus = viewingStatusLabel(viewingStatus);
    switch (action) {
        case 'confirm_viewing':
            return ['pending', 'rescheduled'].includes(normalizedStatus)
                ? readyGuard(action, 'Confirm viewing', 'The linked viewing can be confirmed from fast-track.')
                : blockedGuard(
                    action,
                    'Viewing is not ready to confirm',
                    `The linked viewing is currently ${normalizedStatus}. Open appointments if the real record needs attention.`,
                    'appointments',
                    'Open appointments',
                );
        case 'reschedule_viewing':
            return ['pending', 'confirmed', 'rescheduled'].includes(normalizedStatus)
                ? readyGuard(action, 'Reschedule viewing', 'The current viewing slot can be updated from fast-track.')
                : blockedGuard(
                    action,
                    'Viewing is not ready to reschedule',
                    `The linked viewing is currently ${normalizedStatus}. Open appointments if the real record needs attention.`,
                    'appointments',
                    'Open appointments',
                );
        case 'complete_viewing':
            return normalizedStatus === 'confirmed'
                ? readyGuard(action, 'Complete viewing', 'The linked viewing can be marked completed from fast-track.')
                : blockedGuard(
                    action,
                    'Viewing is not ready to complete',
                    `The linked viewing is currently ${normalizedStatus}. Confirm the appointment before marking it completed.`,
                    'appointments',
                    'Open appointments',
                );
        case 'cancel_viewing':
            return ['pending', 'confirmed', 'rescheduled'].includes(normalizedStatus)
                ? readyGuard(action, 'Cancel viewing', 'The current viewing slot can be cancelled from fast-track.')
                : blockedGuard(
                    action,
                    'Viewing is not ready to cancel',
                    `The linked viewing is currently ${normalizedStatus}. Open appointments if the real record needs attention.`,
                    'appointments',
                    'Open appointments',
                );
        default:
            return blockedGuard(
                action,
                'Viewing action unavailable',
                'This viewing action cannot be completed from the current fast-track state.',
                'appointments',
                'Open appointments',
            );
    }
}

export function getManagerOfferGuard(input: {
    hasManagerLink: boolean;
    hasPropertyLink: boolean;
    workflowError?: string | null;
    isRefreshing?: boolean;
    qualificationComplete: boolean;
    amlComplete: boolean;
    propertyOfferReady: boolean;
    propertyReadinessReason?: string | null;
    propertyReadinessBlockers?: JourneyBlocker[] | null;
    hasValidAmount: boolean;
}): ManagerWorkflowActionGuard {
    const {
        amlComplete,
        hasManagerLink,
        hasPropertyLink,
        hasValidAmount,
        isRefreshing = false,
        propertyOfferReady,
        propertyReadinessBlockers,
        propertyReadinessReason,
        qualificationComplete,
        workflowError,
    } = input;

    if (isRefreshing) {
        return unavailableGuard(
            'record_offer',
            'Live purchase workflow is refreshing',
            'Wait for the latest buyer qualification, AML, and property readiness data before recording the offer.',
            'offer',
        );
    }

    const workflowPresentation = resolveManagerWorkflowErrorPresentation(workflowError || '');
    if (workflowPresentation) {
        return unavailableGuard(
            'record_offer',
            workflowPresentation.title,
            workflowPresentation.message,
            workflowPresentation.scope === 'property_readiness' ? 'seller' : 'offer',
            workflowPresentation.scope === 'property_readiness' ? 'Open seller readiness' : undefined,
        );
    }

    const readinessUnavailable = resolveWorkflowUnavailableGuard({
        action: 'record_offer',
        blockers: propertyReadinessBlockers,
        fallbackTitle: 'Property readiness temporarily unavailable',
        target: 'seller',
    });
    if (readinessUnavailable) {
        return readinessUnavailable;
    }

    if (!hasPropertyLink || !hasManagerLink) {
        return blockedGuard(
            'record_offer',
            'Offer details are incomplete',
            'This purchase application is missing the property or manager link needed to record the first offer.',
            'offer',
        );
    }

    if (!qualificationComplete) {
        return blockedGuard(
            'record_offer',
            'Buyer qualification still needs review',
            'Complete buyer qualification before recording the first offer.',
            'buyer',
            'Open buyer qualification',
        );
    }

    if (!amlComplete) {
        return blockedGuard(
            'record_offer',
            'AML review still needs review',
            'Complete AML review before recording the first offer.',
            'aml',
            'Open AML review',
        );
    }

    if (!propertyOfferReady) {
        return blockedGuard(
            'record_offer',
            'Seller readiness still needs review',
            propertyReadinessReason || 'The seller property pack is not offer-ready yet.',
            'seller',
            'Open seller readiness',
        );
    }

    if (!hasValidAmount) {
        return blockedGuard(
            'record_offer',
            'Offer amount is required',
            'Enter a valid buyer offer amount before continuing.',
            'offer',
        );
    }

    return readyGuard(
        'record_offer',
        'Record buyer offer',
        'Buyer qualification, AML, and seller readiness are all complete.',
    );
}

export function getManagerCreateContractGuard(input: {
    hasContract: boolean;
    applicationApproved: boolean;
    hasPropertyLink: boolean;
    workflowError?: string | null;
    isRefreshing?: boolean;
    rentContractReady: boolean;
    propertyReadinessReason?: string | null;
    propertyReadinessBlockers?: JourneyBlocker[] | null;
}): ManagerWorkflowActionGuard {
    const {
        applicationApproved,
        hasContract,
        hasPropertyLink,
        isRefreshing = false,
        propertyReadinessBlockers,
        propertyReadinessReason,
        rentContractReady,
        workflowError,
    } = input;

    if (hasContract) {
        return readyGuard(
            'create_contract',
            'Contract workspace ready',
            'A contract already exists for this case, so the contracts workspace can stay in control.',
        );
    }

    if (isRefreshing) {
        return unavailableGuard(
            'create_contract',
            'Live rent workflow is refreshing',
            'Wait for the latest case-file, referencing, and readiness data before creating the contract.',
            'property_readiness',
        );
    }

    const workflowPresentation = resolveManagerWorkflowErrorPresentation(workflowError || '');
    if (workflowPresentation) {
        return unavailableGuard(
            'create_contract',
            workflowPresentation.title,
            workflowPresentation.message,
            workflowPresentation.scope === 'property_readiness' ? 'property_readiness' : 'approval',
        );
    }

    const readinessUnavailable = resolveWorkflowUnavailableGuard({
        action: 'create_contract',
        blockers: propertyReadinessBlockers,
        fallbackTitle: 'Property readiness temporarily unavailable',
        target: 'property_readiness',
    });
    if (readinessUnavailable) {
        return readinessUnavailable;
    }

    if (!applicationApproved) {
        return blockedGuard(
            'create_contract',
            'Application approval is still required',
            'Approve the rent application before creating the tenancy contract.',
            'approval',
        );
    }

    if (!hasPropertyLink) {
        return blockedGuard(
            'create_contract',
            'Property readiness is not linked',
            'This rent application is missing the property link needed to review readiness before the contract is created.',
            'property_readiness',
        );
    }

    if (!rentContractReady) {
        return blockedGuard(
            'create_contract',
            'Property readiness still needs review',
            propertyReadinessReason || 'The property compliance pack still needs to be contract-ready before the contract can be created.',
            'property_readiness',
            'Open property readiness',
        );
    }

    return readyGuard(
        'create_contract',
        'Create contract',
        'The rent application is approved and the property readiness pack is contract-ready.',
    );
}

export function getManagerSaleProgressionGuard(input: {
    hasSaleProgression: boolean;
    canProgressFromFastTrack: boolean;
    isRefreshing?: boolean;
    blockers?: JourneyBlocker[] | null;
}): ManagerWorkflowActionGuard {
    const {
        blockers,
        canProgressFromFastTrack,
        hasSaleProgression,
        isRefreshing = false,
    } = input;

    if (isRefreshing) {
        return unavailableGuard(
            'progress_sale',
            'Live purchase workflow is refreshing',
            'Wait for the latest linked purchase workflow data before progressing the sale stage.',
            'applications',
            'Open applications',
        );
    }

    const unavailable = resolveWorkflowUnavailableGuard({
        action: 'progress_sale',
        blockers,
        fallbackTitle: 'Live purchase workflow unavailable',
        target: 'applications',
    });
    if (unavailable) {
        return unavailable;
    }

    if (!hasSaleProgression) {
        return blockedGuard(
            'progress_sale',
            'Purchase stage controls are not ready yet',
            'Record the first offer in the applications workspace before trying to progress the live sale stages from fast-track.',
            'applications',
            'Open applications',
        );
    }

    if (!canProgressFromFastTrack) {
        return blockedGuard(
            'progress_sale',
            'Open the purchase workspace for this stage',
            'This sale stage must be progressed from the dedicated purchase workspace instead of fast-track.',
            'applications',
            'Open applications',
        );
    }

    return readyGuard(
        'progress_sale',
        'Progress sale stage',
        'The next live sale stage can be recorded directly from fast-track.',
    );
}
