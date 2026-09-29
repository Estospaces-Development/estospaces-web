import { getManagerPlanDisplayName } from './managerPlanNames';
import type {
    ManagerSubscriptionEntitlement,
    ManagerSubscriptionResourceLimit,
    ManagerSubscriptionSummary,
    ManagerSubscriptionTrial,
    ManagerTrialGrantSummary,
} from '../services/managerSubscriptionService';

// ── Signup launch offer (core POST /api/v1/auth/register → launch_offer) ────

export type LaunchOfferStatus = 'active' | 'pending' | 'none';

export interface LaunchOffer {
    status: LaunchOfferStatus;
    plan_name?: string;
    ends_at?: string;
}

const LAUNCH_OFFER_STATUSES: readonly LaunchOfferStatus[] = ['active', 'pending', 'none'];
const DEFAULT_TRIAL_PLAN_NAME = 'Growth';

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

const nonEmptyString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** Reads `launch_offer` from a raw or `{ data }`-wrapped signup response. Unknown shapes are ignored. */
export function parseLaunchOffer(payload: unknown): LaunchOffer | null {
    const response = asRecord(payload);
    const raw = asRecord(response?.launch_offer) ?? asRecord(asRecord(response?.data)?.launch_offer);
    if (!raw || !LAUNCH_OFFER_STATUSES.includes(raw.status as LaunchOfferStatus)) {
        return null;
    }
    return {
        status: raw.status as LaunchOfferStatus,
        plan_name: nonEmptyString(raw.plan_name),
        ends_at: nonEmptyString(raw.ends_at),
    };
}

// ── Dates ──────────────────────────────────────────────────────────────────

export const DAY_MS = 24 * 60 * 60 * 1000;
export const TRIAL_ENDING_SOON_DAYS = 7;
export const TRIAL_LAST_DAY_DAYS = 1;

export type TrialDateFormatter = (date: Date) => string;

export const formatTrialDate: TrialDateFormatter = (date) =>
    new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);

const parseDate = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

/** Whole days left, rounded up, so 25 hours left is 2 days and anything past the end is 0. */
export function trialDaysRemaining(endsAt: Date, now: Date): number {
    const remaining = endsAt.getTime() - now.getTime();
    return remaining <= 0 ? 0 : Math.ceil(remaining / DAY_MS);
}

/**
 * Days left for the warnings. Payment's days_remaining is preferred (it uses
 * the server clock); the local count only decides that the end has passed and
 * covers a missing or malformed server value.
 */
export function trialBannerDays(trial: Pick<ManagerSubscriptionTrial, 'state' | 'days_remaining'>, endsAt: Date, now: Date): number {
    const local = trialDaysRemaining(endsAt, now);
    if (local === 0) return 0;
    const server = trial.days_remaining;
    return trial.state === 'active' && Number.isInteger(server) && server > 0 ? server : local;
}

export function getLaunchOfferMessage(offer: LaunchOffer | null | undefined, formatDate: TrialDateFormatter = formatTrialDate): string | null {
    if (!offer) return null;
    const planName = offer.plan_name || DEFAULT_TRIAL_PLAN_NAME;
    if (offer.status === 'active') {
        const endsAt = parseDate(offer.ends_at);
        return endsAt
            ? `${planName} plan active until ${formatDate(endsAt)}. No card needed.`
            : `${planName} plan active. No card needed.`;
    }
    if (offer.status === 'pending') {
        return `Your 60-day ${planName} plan will be ready when you sign in.`;
    }
    return null;
}

// ── Trial banner ───────────────────────────────────────────────────────────

export type TrialBannerKind = 'active' | 'ending_soon' | 'last_day' | 'ended';

export interface TrialBanner {
    kind: TrialBannerKind;
    tone: 'info' | 'warning' | 'neutral';
    title: string;
    detail?: string;
    action?: { label: string };
}

export const TRIAL_NO_CHARGE_NOTE = "We haven't taken card details and won't charge you automatically.";

function formatLimit(limit: ManagerSubscriptionResourceLimit | undefined, singular: string, plural: string): string | null {
    if (limit?.kind === 'unlimited') return `unlimited ${plural}`;
    if (limit?.kind === 'finite' && Number.isInteger(limit.value) && (limit.value ?? -1) >= 0) {
        return `${limit.value} ${limit.value === 1 ? singular : plural}`;
    }
    return null;
}

function limitPhrases(entitlement: ManagerSubscriptionEntitlement | null | undefined) {
    return {
        properties: formatLimit(entitlement?.published_property_limit, 'published property', 'published properties'),
        cases: formatLimit(entitlement?.active_case_limit, 'active Fast Track case', 'active Fast Track cases'),
    };
}

const joinAnd = (parts: (string | null)[]) => parts.filter(Boolean).join(' and ');

/**
 * Chooses the trial banner for the manager dashboard and subscription page.
 * Limits always come from the current entitlement: the trial snapshot while
 * the trial runs, and the Free limits after it ends.
 */
export function getTrialBanner(
    trial: ManagerSubscriptionTrial | null | undefined,
    entitlement: ManagerSubscriptionEntitlement | null | undefined,
    now: Date,
    formatDate: TrialDateFormatter = formatTrialDate,
): TrialBanner | null {
    if (!trial || trial.state === 'superseded' || trial.state === 'revoked') return null;
    // Paid access (or a legacy pilot) outranks the trial; the trial copy would be wrong.
    if (entitlement && entitlement.source !== 'trial' && entitlement.source !== 'free') return null;
    const endsAt = parseDate(trial.ends_at);
    if (!endsAt) return null;

    const planName = trial.plan_code ? getManagerPlanDisplayName(trial.plan_code) : (trial.plan_name || DEFAULT_TRIAL_PLAN_NAME);
    const date = formatDate(endsAt);
    const days = trialBannerDays(trial, endsAt, now);

    if (trial.state === 'expired' || days === 0) {
        // Until payment reports the Free entitlement, its numbers are unknown and omitted.
        const free = limitPhrases(entitlement?.source === 'free' ? entitlement : null);
        const freeLimits = joinAnd([free.properties, free.cases]);
        return {
            kind: 'ended',
            tone: 'neutral',
            title: `Your ${planName} trial ended on ${date}.`,
            detail: `${freeLimits ? `You're on Free: ${freeLimits}.` : "You're on Free."} Existing listings and cases stay as they are.`,
            action: { label: 'See plans' },
        };
    }

    const { properties, cases } = limitPhrases(entitlement?.source === 'trial' ? entitlement : null);
    if (days <= TRIAL_ENDING_SOON_DAYS) {
        const keep = joinAnd([properties, cases]);
        return {
            kind: days <= TRIAL_LAST_DAY_DAYS ? 'last_day' : 'ending_soon',
            tone: 'warning',
            title: days <= TRIAL_LAST_DAY_DAYS
                ? `Your ${planName} plan ends within a day, on ${date}.`
                : `Your ${planName} plan ends in ${days} days, on ${date}.`,
            detail: `Subscribe to keep ${keep || `your ${planName} limits`}. ${TRIAL_NO_CHARGE_NOTE}`,
            action: { label: 'Subscribe' },
        };
    }

    return {
        kind: 'active',
        tone: 'info',
        title: [`${planName} plan active until ${date}`, properties, cases].filter(Boolean).join(' · '),
    };
}

/** Account-scoped cache key so another manager on this tab never sees the summary. */
export const managerSubscriptionSummaryQueryKey = (userId: string | null | undefined) =>
    ['manager-subscription-summary', userId || ''] as const;

/**
 * Shown next to checkout while a trial runs: subscribing starts billing now
 * and the rest of the trial ends (payment supersedes it on the first paid period).
 */
export function getTrialCheckoutNote(
    trial: ManagerSubscriptionTrial | null | undefined,
    now: Date,
    formatDate: TrialDateFormatter = formatTrialDate,
): string | null {
    if (!trial || trial.state !== 'active') return null;
    const endsAt = parseDate(trial.ends_at);
    if (!endsAt || trialDaysRemaining(endsAt, now) === 0) return null;
    const planName = trial.plan_code ? getManagerPlanDisplayName(trial.plan_code) : (trial.plan_name || DEFAULT_TRIAL_PLAN_NAME);
    return `Your ${planName} trial runs until ${formatDate(endsAt)}. If you subscribe now, billing starts today and the remaining trial days end.`;
}

// ── Trial code redemption ──────────────────────────────────────────────────

/**
 * The trial-code field is offered only to a manager on Free access with no
 * checkout in progress. Payment allows one trial per manager ever, so any
 * recorded trial (active, ended, superseded or revoked) hides it, as does
 * paid, trial or pilot access. An unknown entitlement also hides it.
 */
export function canRedeemTrialCode(summary: ManagerSubscriptionSummary | null | undefined): boolean {
    if (!summary || summary.trial || summary.checkout || summary.new_paid_actions_available) return false;
    return summary.entitlement?.source === 'free';
}

/** "Growth plan active until 29 November 2026. No card needed." */
export function getTrialCodeRedeemedMessage(
    grant: Pick<ManagerTrialGrantSummary, 'plan_code' | 'plan_name' | 'ends_at'>,
    formatDate: TrialDateFormatter = formatTrialDate,
): string {
    const planName = grant.plan_code ? getManagerPlanDisplayName(grant.plan_code) : (grant.plan_name || DEFAULT_TRIAL_PLAN_NAME);
    const endsAt = parseDate(grant.ends_at);
    return endsAt ? `${planName} plan active until ${formatDate(endsAt)}. No card needed.` : `${planName} plan active. No card needed.`;
}
