import { isManagerLivePropertyStatus } from '@/lib/managerPropertyDashboard';
import { buildPlanLimitNotice, getPlanLimitResource } from '@/lib/planLimit';
import {
    BOOKING_ACTIVITY_UNAVAILABLE_CODE,
    PROPERTY_ACTIVE_BOOKING_WORK_CODE,
    PROPERTY_STATUS_CONFLICT_CODE,
    type ManagerListingAction,
    type ManagerListingStatusResult,
} from '@/services/propertyService';

// Unpublish, republish and Mark sold / Mark let are the manager's own listing
// actions (owner decision, 10 Oct 2026). Core decides what is allowed; this only
// decides which buttons to offer and how to word the dialog and a refusal.

export interface ManagerListingSubject {
    title?: string | null;
    status?: string | null;
    listingType?: string | null;
    /** Set once an admin has approved the listing. */
    publishedAt?: string | null;
}

const normalize = (value?: string | null) => value?.trim().toLowerCase() || '';

/** Sale and buy listings are marked sold; rent, lease and short-stay listings are marked let. */
export const isSaleListing = (listingType?: string | null) => ['sale', 'buy'].includes(normalize(listingType));

/** A draft that was live once: only Unpublish leaves an approval date on a draft. */
export const isOwnerUnpublished = (subject: ManagerListingSubject) => (
    normalize(subject.status) === 'draft' && Boolean(subject.publishedAt)
);

/** The actions core would accept for this listing right now, in display order. */
export const getManagerListingActions = (subject: ManagerListingSubject): ManagerListingAction[] => {
    if (isManagerLivePropertyStatus(subject.status)) {
        return ['unpublish', 'mark_sold'];
    }
    if (isOwnerUnpublished(subject)) {
        return ['republish'];
    }
    return [];
};

export const getManagerListingActionLabel = (action: ManagerListingAction, listingType?: string | null) => {
    switch (action) {
        case 'unpublish':
            return 'Unpublish';
        case 'republish':
            return 'Republish';
        default:
            return isSaleListing(listingType) ? 'Mark sold' : 'Mark let';
    }
};

export interface ManagerListingActionCopy {
    title: string;
    summary: string;
    effects: string[];
    confirmLabel: string;
    successMessage: string;
    /** "unpublish", "mark this listing as sold": completes "You can't ___ while bookings are open". */
    refusedAs: string;
}

const BOOKING_RULE = 'This is not possible while a Fast Track case, viewing, application or contract is still open on the listing.';

export const describeManagerListingAction = (
    action: ManagerListingAction,
    subject: ManagerListingSubject,
): ManagerListingActionCopy => {
    const name = subject.title?.trim() || 'This listing';
    if (action === 'unpublish') {
        return {
            title: 'Unpublish this listing?',
            summary: `${name} leaves search and public pages straight away.`,
            effects: [
                'It stays in your inventory as a draft and nothing is deleted.',
                'You can republish it yourself later without waiting for admin approval.',
                BOOKING_RULE,
            ],
            confirmLabel: 'Unpublish',
            successMessage: 'Listing unpublished. It is no longer public.',
            refusedAs: 'unpublish',
        };
    }
    if (action === 'republish') {
        return {
            title: 'Republish this listing?',
            summary: `${name} goes back into search and public pages straight away.`,
            effects: [
                "It counts towards your plan's published-listing limit again.",
                'It can only be republished because an admin approved it earlier.',
            ],
            confirmLabel: 'Republish',
            successMessage: 'Listing republished. It is live again.',
            refusedAs: 'republish',
        };
    }
    const sale = isSaleListing(subject.listingType);
    const word = sale ? 'sold' : 'let';
    return {
        title: `Mark this listing as ${word}?`,
        summary: `${name} is marked as ${word}${sale ? '' : ' and fully occupied'}, and leaves search straight away.`,
        effects: [
            `${sale ? 'Buyers' : 'Renters'} can no longer start a viewing, application or Fast Track on it.`,
            "You can't reopen it from your dashboard. Contact support if you marked it by mistake.",
            BOOKING_RULE,
        ],
        confirmLabel: `Mark as ${word}`,
        successMessage: `Listing marked as ${word}.`,
        refusedAs: `mark this listing as ${word}`,
    };
};

const ACTIVE_WORK_KINDS: ReadonlyArray<{ key: string; one: string; many: string }> = [
    { key: 'fast_track_cases', one: 'active Fast Track case', many: 'active Fast Track cases' },
    { key: 'upcoming_viewings', one: 'upcoming viewing', many: 'upcoming viewings' },
    { key: 'open_applications', one: 'open application', many: 'open applications' },
    { key: 'open_contracts', one: 'open contract', many: 'open contracts' },
    { key: 'open_reservations', one: 'upcoming reservation', many: 'upcoming reservations' },
];

/** "2 upcoming viewings", one line per kind of Booking work that is still open. */
export const summarizeActiveWork = (counts?: Record<string, number> | null): string[] => (
    ACTIVE_WORK_KINDS.flatMap(({ key, one, many }) => {
        const count = counts?.[key] ?? 0;
        if (!(count > 0)) {
            return [];
        }
        return [count === 1 ? `1 ${one}` : `${count} ${many}`];
    })
);

export interface ManagerListingFailure {
    title: string;
    message: string;
    /** What is still open, one line each. */
    items: string[];
    /** Set for the plan-limit refusal. */
    upgrade?: { label: string; href: string };
}

/** Turns core's refusal into something a manager can act on. Nothing changed unless the answer was lost. */
export const presentManagerListingActionError = (
    action: ManagerListingAction,
    result: Pick<ManagerListingStatusResult, 'error' | 'status' | 'code' | 'activeWork'>,
    subject: ManagerListingSubject = {},
): ManagerListingFailure => {
    const serverMessage = result.error?.trim() || '';
    const { status, code } = result;

    if (status === undefined) {
        // The request may have reached core before the connection dropped.
        return {
            title: "We didn't get an answer",
            message: 'Refresh the page to see whether the change was made, then try again if it was not.',
            items: [],
        };
    }
    if (status === 409 && code === PROPERTY_ACTIVE_BOOKING_WORK_CODE) {
        const items = summarizeActiveWork(result.activeWork);
        const contractNote = (result.activeWork?.open_contracts ?? 0) > 0
            ? ' Withdraw any unsigned contract; a signed contract blocks this until its end date.'
            : '';
        return {
            title: `You can't ${describeManagerListingAction(action, subject).refusedAs} while bookings are open`,
            message: items.length > 0 ? `Finish or cancel these first, then try again.${contractNote}` : serverMessage,
            items,
        };
    }
    if (status === 409 && code === PROPERTY_STATUS_CONFLICT_CODE) {
        return { title: "This listing can't be changed that way", message: serverMessage, items: [] };
    }
    if (status === 409 && getPlanLimitResource(serverMessage) === 'published_properties') {
        const notice = buildPlanLimitNotice('published_properties');
        return { title: notice.title, message: notice.message, items: [], upgrade: notice.action };
    }
    if (status === 503 && code === BOOKING_ACTIVITY_UNAVAILABLE_CODE) {
        return {
            title: "We couldn't check this listing's bookings",
            message: 'Nothing was changed because we could not confirm that no Fast Track case, viewing, application or contract is open. Please try again in a moment.',
            items: [],
        };
    }
    if (status === 503 || status === 502 || status === 504) {
        return {
            title: 'This could not be completed right now',
            message: 'Nothing was changed. Please try again in a moment.',
            items: [],
        };
    }
    if (status === 403) {
        const notOwner = /not property owner/i.test(serverMessage);
        return {
            title: notOwner ? 'This is not your listing' : "You can't do this yet",
            message: notOwner ? 'You can only change listings you own.' : serverMessage || 'Your account is not allowed to do this.',
            items: [],
        };
    }
    if (status === 404) {
        // Core answers "property not found" for a missing listing; anything else is a core
        // that does not have the route yet (web and core deploy independently).
        if (/property not found/i.test(serverMessage)) {
            return { title: 'Listing not found', message: 'This listing no longer exists. Go back to your properties and refresh.', items: [] };
        }
        return { title: 'Not available yet', message: 'This action is not available yet. Nothing was changed. Please try again later.', items: [] };
    }
    return {
        title: 'Nothing was changed',
        message: status >= 500 || !serverMessage ? 'Something went wrong on our side. Please try again.' : serverMessage,
        items: [],
    };
};
