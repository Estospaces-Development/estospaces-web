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
    /** The page being opened; areas with existing records open read-through while review is under way. */
    area?: VerifiedManagerArea;
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
    /** Not verified, but existing records stay open under a banner. */
    | { kind: 'open-with-notice'; notice: ManagerVerificationNotice }
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
    if (!notice) {
        return { kind: 'allow' };
    }
    // Every status except a first-time `incomplete` profile means the manager
    // submitted or held verification, so live cases, appointments and contracts
    // may exist. Booking enforces role and ownership only, so they stay open.
    if (!notice.retryable && notice.status !== 'incomplete' && input.area && input.area in VERIFIED_MANAGER_AREA_VIEW_ACTION) {
        return { kind: 'open-with-notice', notice };
    }
    return { kind: 'gate', notice };
}

/**
 * What stays true while the manager is not verified, stated per page. Only
 * restrictions that a backend actually enforces are described as blocked:
 * core clears `fast_track_eligible` on re-verification and refuses new Fast
 * Track case links for ineligible managers, while booking keeps serving and
 * accepting actions on existing appointments, contracts and Fast Track cases
 * for their manager (it checks role and ownership, never verification).
 */
export const VERIFIED_MANAGER_AREA_DETAIL: Record<Exclude<VerifiedManagerArea, 'subscription'>, string> = {
    'fast-track': 'Your existing Fast Track cases stay open and you can keep working on them. Starting new cases is paused until an admin approves your verification.',
    appointments: 'Your existing appointments stay open while your verification is reviewed.',
    contracts: 'Your existing contracts stay open while your verification is reviewed.',
    // The manager lead and property feeds that analytics summarises only load
    // for verified managers, so a partial view would be misleading.
    analytics: 'Analytics open once your manager verification is approved.',
};

/**
 * The same pages for a manager whose verification was rejected or revoked
 * (core stores a revoke as `rejected`) and not approved since. Booking refuses
 * every write from them, so the banner says view only, not "keep working".
 */
export const VIEW_ONLY_MANAGER_AREA_DETAIL: Record<Exclude<VerifiedManagerArea, 'subscription'>, string> = {
    'fast-track': 'Your existing Fast Track cases stay open to view, but you cannot change them or start new cases until an admin re-approves you.',
    appointments: 'Your existing appointments stay open to view, but you cannot confirm, reschedule, complete or cancel them until an admin re-approves you.',
    contracts: 'Your existing contracts stay open to view, but you cannot create, sign or withdraw them until an admin re-approves you.',
    analytics: VERIFIED_MANAGER_AREA_DETAIL.analytics,
};

export const getVerifiedManagerAreaDetail = (
    area: Exclude<VerifiedManagerArea, 'subscription'>,
    viewOnly: boolean,
): string => (
    viewOnly ? VIEW_ONLY_MANAGER_AREA_DETAIL[area] : VERIFIED_MANAGER_AREA_DETAIL[area]
);

/** Pages whose existing records can be opened while verification is pending. */
export const VERIFIED_MANAGER_AREA_VIEW_ACTION: Partial<Record<VerifiedManagerArea, string>> = {
    'fast-track': 'View existing Fast Track cases',
    appointments: 'View existing appointments',
    contracts: 'View existing contracts',
};

export const SUBSCRIPTION_CHECKOUT_VERIFICATION_REASON = 'Checkout is available once your manager verification is approved. You can still compare plans and prices, and manage any existing subscription.';
