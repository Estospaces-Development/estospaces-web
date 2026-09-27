import type { VerificationStatus } from '@/services/managerVerificationService';

/**
 * Manager pages that open fully only once core reports the manager profile as
 * verified. The gate is a UX boundary; the owning services still decide what
 * each request may do.
 */
export type VerifiedManagerArea = 'subscription' | 'fast-track' | 'appointments' | 'contracts' | 'analytics';

export const MANAGER_VERIFICATION_PATH = '/manager/verification';

export const VERIFIED_MANAGER_AREA_LABELS: Record<VerifiedManagerArea, string> = {
    subscription: 'Subscription',
    'fast-track': 'Fast Track',
    appointments: 'Appointments',
    contracts: 'Contracts',
    analytics: 'Analytics',
};

export interface ManagerVerificationGateInput {
    isLoading: boolean;
    error?: string | null;
    hasProfile: boolean;
    verificationStatus: VerificationStatus | null;
    /** Reason recorded by core when it moved the profile back to review. */
    reverificationReason?: string | null;
}

export type ManagerVerificationGateStatus = VerificationStatus | 'unknown';

export interface ManagerVerificationNotice {
    status: ManagerVerificationGateStatus;
    statusLabel: string;
    heading: string;
    reason: string;
    /** The status could not be read; offer a retry rather than a verification step. */
    retryable: boolean;
}

export type ManagerVerificationGateDecision =
    | { kind: 'loading' }
    | { kind: 'allow' }
    | { kind: 'gate'; notice: ManagerVerificationNotice };

const STATUS_LABELS: Record<ManagerVerificationGateStatus, string> = {
    approved: 'Verified',
    submitted: 'Pending review',
    under_review: 'Under review',
    rejected: 'Changes requested',
    verification_required: 'Re-verification required',
    incomplete: 'Not verified',
    unknown: 'Unavailable',
};

export const getManagerVerificationStatusLabel = (status: ManagerVerificationGateStatus): string => (
    STATUS_LABELS[status] ?? STATUS_LABELS.incomplete
);

export function getManagerVerificationNotice(input: ManagerVerificationGateInput): ManagerVerificationNotice | null {
    if (input.error && !input.verificationStatus) {
        return {
            status: 'unknown',
            statusLabel: STATUS_LABELS.unknown,
            heading: "We couldn't confirm your verification status",
            reason: 'Your manager verification status did not load, so this page is paused until it can be confirmed. Nothing has been changed.',
            retryable: true,
        };
    }

    const status: VerificationStatus = input.hasProfile ? (input.verificationStatus ?? 'incomplete') : 'incomplete';
    if (status === 'approved') {
        return null;
    }

    const base = { status, statusLabel: STATUS_LABELS[status], retryable: false } as const;
    switch (status) {
        case 'submitted':
        case 'under_review':
            return {
                ...base,
                heading: 'Your manager profile is pending verification',
                reason: 'An admin is reviewing your verification. This page opens fully once your profile is approved.',
            };
        case 'verification_required': {
            const recorded = input.reverificationReason?.trim();
            return {
                ...base,
                heading: 'Re-verification required after profile changes',
                reason: `${recorded || 'Your verified manager details changed, so an admin must review them again.'} Resubmit your verification to continue.`,
            };
        }
        case 'rejected':
            return {
                ...base,
                heading: 'Your manager verification needs changes',
                reason: 'Review the feedback on the verification page, update your details or documents and resubmit.',
            };
        case 'incomplete':
        default:
            return {
                ...base,
                heading: 'Complete your manager verification',
                reason: 'Finish your manager profile and upload the required documents so an admin can verify you.',
            };
    }
}

export function resolveManagerVerificationGate(input: ManagerVerificationGateInput): ManagerVerificationGateDecision {
    if (input.isLoading) {
        return { kind: 'loading' };
    }

    const notice = getManagerVerificationNotice(input);
    return notice ? { kind: 'gate', notice } : { kind: 'allow' };
}

/**
 * What stays true while the manager is not verified, stated per page. Only
 * restrictions that a backend actually enforces are described as blocked:
 * core clears `fast_track_eligible` on re-verification and refuses new Fast
 * Track case links for ineligible managers, while booking keeps serving
 * existing appointments, contracts and Fast Track cases to their manager.
 */
export const VERIFIED_MANAGER_AREA_DETAIL: Record<Exclude<VerifiedManagerArea, 'subscription'>, string> = {
    'fast-track': 'Existing Fast Track cases stay available to view. Fast Track eligibility for new cases is paused until an admin approves your verification.',
    appointments: 'Existing appointments stay available to view while your verification is reviewed.',
    contracts: 'Existing contracts stay available to view while your verification is reviewed.',
    // The manager lead and property feeds that analytics summarises only load
    // for verified managers, so a partial view would be misleading.
    analytics: 'Analytics open once your manager verification is approved.',
};

/** Pages whose existing records can be opened while verification is pending. */
export const VERIFIED_MANAGER_AREA_VIEW_ACTION: Partial<Record<VerifiedManagerArea, string>> = {
    'fast-track': 'View existing Fast Track cases',
    appointments: 'View existing appointments',
    contracts: 'View existing contracts',
};

export const SUBSCRIPTION_CHECKOUT_VERIFICATION_REASON = 'Checkout is available once your manager verification is approved. You can still compare plans and prices, and manage any existing subscription.';
