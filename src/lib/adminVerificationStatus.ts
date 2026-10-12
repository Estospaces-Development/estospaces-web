export interface VerificationStatusTone {
    badgeClassName: string;
    dotClassName: string;
}

// One tone per state, AA contrast (-800 on -100, -200 on dark -900/40).
// Submitted waits on an admin, Incomplete waits on the manager, so they differ.
const TONES = {
    submitted: { badgeClassName: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', dotClassName: 'bg-sky-500' },
    incomplete: { badgeClassName: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200', dotClassName: 'bg-slate-500' },
    actionNeeded: { badgeClassName: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200', dotClassName: 'bg-orange-500' },
    inReview: { badgeClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200', dotClassName: 'bg-blue-500' },
    approved: { badgeClassName: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200', dotClassName: 'bg-green-500' },
    rejected: { badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200', dotClassName: 'bg-red-500' },
} satisfies Record<string, VerificationStatusTone>;

/** Badge and dot colours for a manager/broker verification status in the admin list. */
export function getManagerVerificationTone(status: string): VerificationStatusTone {
    switch (status) {
        case 'submitted':
        case 'pending':
        case 'documents_submitted':
            return TONES.submitted;
        case 'incomplete':
        case 'basic':
        case 'profile_required':
            return TONES.incomplete;
        case 'verification_required':
            return TONES.actionNeeded;
        case 'under_review':
            return TONES.inReview;
        case 'approved':
        case 'verified':
        case 'fully_verified':
            return TONES.approved;
        default:
            return TONES.rejected;
    }
}
