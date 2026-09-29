import { z } from 'zod';

import { ApiRequestError } from './apiUtils';
import { getManagerPlanDisplayName } from './managerPlanNames';
import type {
    AdminPromotion,
    AdminPromotionAction,
    AdminPromotionDraft,
    AdminPromotionMarket,
    AdminPromotionPatch,
    AdminPromotionStatus,
    AdminTrialBackfillResult,
    AdminTrialGrant,
} from '../services/adminSubscriptionService';

// Rules mirror payment internal/subscriptions/promotion.go validateShape and
// validateActivation. The server stays authoritative; this only catches
// mistakes before a round trip.

export const PROMOTION_NAME_MAX = 128;
export const PROMOTION_DESCRIPTION_MAX = 1000;
export const PROMOTION_REDEMPTION_CAP_MAX = 1_000_000;
export const TRIAL_REVOKE_REASON_MAX = 500;
export const RAZORPAY_OFFER_ID_PATTERN = /^offer_[A-Za-z0-9]{1,122}$/;
export const PROMOTION_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
export const PERCENT_OFF_RANGE = { min: 1, max: 90 } as const;
export const DISCOUNT_CYCLES_RANGE = { min: 1, max: 24 } as const;
export const TRIAL_DAYS_RANGE = { min: 1, max: 365 } as const;

// ── Create form ────────────────────────────────────────────────────────────

/** Raw form state: inputs are strings, checkboxes are booleans. */
export interface PromotionFormValues {
    kind: 'trial_grant' | 'percent_discount';
    name: string;
    description: string;
    code: string;
    plan_code: 'pro' | 'growth';
    trial_days: string;
    auto_apply_on_signup: boolean;
    percent_off: string;
    discount_cycles: string;
    provider_offer_id_inr: string;
    provider_offer_id_gbp: string;
    /** `datetime-local` value, read in the admin's local time zone. */
    valid_from: string;
    valid_until: string;
    max_redemptions: string;
    /** Discount markets only. A trial has no market filter. */
    market_in: boolean;
    market_gb: boolean;
}

export type PromotionFormField = keyof PromotionFormValues | 'markets';
export type PromotionFormErrors = Partial<Record<PromotionFormField, string>>;

export const emptyPromotionForm = (kind: PromotionFormValues['kind'] = 'trial_grant'): PromotionFormValues => ({
    kind,
    name: '',
    description: '',
    code: '',
    plan_code: 'pro',
    trial_days: '60',
    auto_apply_on_signup: false,
    percent_off: '',
    discount_cycles: '',
    provider_offer_id_inr: '',
    provider_offer_id_gbp: '',
    valid_from: '',
    valid_until: '',
    max_redemptions: '',
    market_in: false,
    market_gb: false,
});

const wholeNumber = (label: string, min: number, max: number) => z.string().trim()
    .regex(/^\d+$/, `${label} must be a whole number.`)
    .transform(Number)
    .refine((value) => value >= min && value <= max, `${label} must be between ${min} and ${max}.`);

const localDateTime = (label: string) => z.string().trim()
    .refine((value) => value === '' || !Number.isNaN(new Date(value).getTime()), `${label} is not a valid date and time.`);

const offerID = (currency: string) => z.string().trim()
    .refine((value) => value === '' || RAZORPAY_OFFER_ID_PATTERN.test(value), `The ${currency} offer ID must look like offer_ followed by letters and numbers.`);

const redemptionCap = z.string().trim()
    .refine((value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= PROMOTION_REDEMPTION_CAP_MAX),
        `The usage cap must be a whole number from 1 to ${PROMOTION_REDEMPTION_CAP_MAX.toLocaleString('en-GB')}, or empty for no cap.`);

// payment-service measures these limits in UTF-8 bytes (Go len), so "₹" counts as 3.
export const utf8ByteLength = (value: string) => new TextEncoder().encode(value).length;

// payment-service only accepts canonical lowercase UUIDs.
export const normalizeManagerID = (value: string) => value.trim().toLowerCase();

const promotionName = z.string().trim().min(1, 'Enter a name admins will recognise.')
    .refine((value) => utf8ByteLength(value) <= PROMOTION_NAME_MAX, `Keep the name shorter (up to ${PROMOTION_NAME_MAX} bytes; symbols like ₹ count as more than one).`);
const promotionDescription = z.string().trim()
    .refine((value) => utf8ByteLength(value) <= PROMOTION_DESCRIPTION_MAX, `Keep the description shorter (up to ${PROMOTION_DESCRIPTION_MAX} bytes; symbols like ₹ count as more than one).`);

const baseShape = {
    name: promotionName,
    description: promotionDescription,
    code: z.string().trim().transform((value) => value.toUpperCase())
        .refine((value) => value === '' || PROMOTION_CODE_PATTERN.test(value), 'Codes are 3–32 letters, numbers, hyphens or underscores.'),
    plan_code: z.enum(['pro', 'growth']),
    valid_from: localDateTime('Start').refine((value) => value !== '', 'Choose when the promotion starts.'),
    valid_until: localDateTime('End'),
    max_redemptions: redemptionCap,
};

const trialSchema = z.object({
    ...baseShape,
    kind: z.literal('trial_grant'),
    trial_days: wholeNumber('Trial days', TRIAL_DAYS_RANGE.min, TRIAL_DAYS_RANGE.max),
    auto_apply_on_signup: z.boolean(),
});

const discountSchema = z.object({
    ...baseShape,
    kind: z.literal('percent_discount'),
    percent_off: wholeNumber('Percent off', PERCENT_OFF_RANGE.min, PERCENT_OFF_RANGE.max),
    discount_cycles: wholeNumber('Discounted months', DISCOUNT_CYCLES_RANGE.min, DISCOUNT_CYCLES_RANGE.max),
    provider_offer_id_inr: offerID('INR'),
    provider_offer_id_gbp: offerID('GBP'),
    market_in: z.boolean(),
    market_gb: z.boolean(),
});

const promotionFormSchema = z.discriminatedUnion('kind', [trialSchema, discountSchema]).superRefine((value, ctx) => {
    if (value.valid_until && value.valid_from && new Date(value.valid_until).getTime() <= new Date(value.valid_from).getTime()) {
        ctx.addIssue({ code: 'custom', path: ['valid_until'], message: 'The end must be after the start.' });
    }
    if (value.kind === 'percent_discount') {
        if (!value.code) {
            ctx.addIssue({ code: 'custom', path: ['code'], message: 'Managers type this code at checkout, so a discount needs one.' });
        }
        if (!value.market_in && !value.market_gb) {
            ctx.addIssue({ code: 'custom', path: ['markets'], message: 'Choose at least one market for the discount.' });
        }
    }
});

export type PromotionFormResult =
    | { success: true; draft: AdminPromotionDraft }
    | { success: false; errors: PromotionFormErrors };

const optional = (value: string): string | undefined => value === '' ? undefined : value;

function collectErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
    const errors: Record<string, string> = {};
    for (const issue of issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && !errors[field]) errors[field] = issue.message;
    }
    return errors;
}

/**
 * Validates the create form and builds the exact payment request body. A trial
 * body never contains markets, offers or discount fields; a discount body sends
 * offers only for its selected markets (offers are optional until activation).
 */
export function buildPromotionDraft(values: PromotionFormValues): PromotionFormResult {
    const parsed = promotionFormSchema.safeParse(values);
    if (!parsed.success) {
        return { success: false, errors: collectErrors(parsed.error.issues) as PromotionFormErrors };
    }
    const value = parsed.data;
    const base = {
        name: value.name,
        description: optional(value.description),
        plan_code: value.plan_code,
        valid_from: new Date(value.valid_from).toISOString(),
        valid_until: value.valid_until ? new Date(value.valid_until).toISOString() : undefined,
        max_redemptions: value.max_redemptions ? Number(value.max_redemptions) : undefined,
    };
    if (value.kind === 'trial_grant') {
        return {
            success: true,
            draft: { ...base, code: optional(value.code), kind: 'trial_grant', trial_days: value.trial_days, auto_apply_on_signup: value.auto_apply_on_signup },
        };
    }
    const markets: AdminPromotionMarket[] = [];
    if (value.market_in) markets.push('IN');
    if (value.market_gb) markets.push('GB');
    return {
        success: true,
        draft: {
            ...base,
            kind: 'percent_discount',
            code: value.code,
            percent_off: value.percent_off,
            discount_cycles: value.discount_cycles,
            eligible_markets: markets,
            provider_offer_id_inr: value.market_in ? optional(value.provider_offer_id_inr) : undefined,
            provider_offer_id_gbp: value.market_gb ? optional(value.provider_offer_id_gbp) : undefined,
        },
    };
}

export const RAZORPAY_OFFER_STEPS: readonly string[] = [
    'Open the Razorpay Dashboard in the same mode as this environment (Test mode for dev).',
    'Go to Offers, choose Create New Offer, then “Offers on Subscriptions”.',
    'Set Redemption Type to “Limited Number of Cycles” with the discounted months below, and Discount Type to Percentage with the percent below.',
    'Set Maximum Discount to at least the full discount on this plan’s price, so Razorpay never caps it. Leave the minimum and maximum order amounts empty.',
    'Set Payment Method to Card with no card type, bank or network restriction, and set “On Offer validation failure” to “Do not allow payment to go through”.',
    'Create one offer in INR and, if the UK is selected, a second offer in GBP. Copy each offer ID (it starts with offer_) and paste it below. You can save the draft first and add offers later; activation needs one per selected market.',
];

// ── Razorpay offer checklist before activating a discount ──────────────────

export interface OfferChecklistItem {
    id: string;
    label: string;
}

export const OFFER_CHECKLIST_EXPLANATION = 'Razorpay charges what its offer says, not what this promotion says. If the offer differs in any of these settings, managers are charged a different amount and payment verification rejects the payment. Check each setting in the Razorpay Dashboard, then tick it.';

const MARKET_CURRENCY: Record<AdminPromotionMarket, { currency: 'INR' | 'GBP'; offerField: 'provider_offer_id_inr' | 'provider_offer_id_gbp' }> = {
    IN: { currency: 'INR', offerField: 'provider_offer_id_inr' },
    GB: { currency: 'GBP', offerField: 'provider_offer_id_gbp' },
};

/**
 * The settings every Razorpay offer behind a percent discount must have. It
 * is a client-side confirmation only: the payment service cannot read the
 * offer's configuration, so the admin confirms it before activating.
 */
export function getOfferChecklist(
    promotion: Pick<AdminPromotion, 'kind' | 'percent_off' | 'discount_cycles' | 'eligible_markets' | 'provider_offer_id_inr' | 'provider_offer_id_gbp'>,
    windowLabel: string,
): OfferChecklistItem[] {
    if (promotion.kind !== 'percent_discount') return [];
    const percent = promotion.percent_off ?? '?';
    const cycles = promotion.discount_cycles ?? '?';
    const items: OfferChecklistItem[] = [
        { id: 'offer_type', label: `Offer type is Percentage, at exactly ${percent}% off.` },
        { id: 'cycles', label: `Applies to “Limited number of cycles”, set to ${cycles} (the discounted months).` },
        { id: 'payment_methods', label: 'Payment method is Card, with no card type, bank or network restriction. Razorpay allows one method per subscription offer, so managers using this discount pay by card; other methods are declined, never charged full price.' },
        { id: 'max_discount', label: 'Maximum Discount is at least the full discount on this plan, so Razorpay never caps it.' },
        { id: 'failure', label: 'On payment failure or validation failure: do not allow the payment without the offer.' },
        { id: 'validity', label: `The offer’s validity dates cover this promotion’s window (${windowLabel}).` },
    ];
    for (const market of promotion.eligible_markets) {
        const { currency, offerField } = MARKET_CURRENCY[market];
        const offerID = promotion[offerField];
        items.push({ id: `offer_${currency}`, label: `One ${currency} offer on the ${currency} plan, with ID ${offerID || '(not set yet)'} pasted in this promotion.` });
    }
    return items;
}

/** Activate stays disabled until every checklist item is ticked. */
export function isOfferChecklistComplete(items: readonly OfferChecklistItem[], ticked: ReadonlySet<string> | readonly string[]): boolean {
    const done = new Set<string>(ticked);
    return items.length > 0 && items.every((item) => done.has(item.id));
}

// ── Edit (PATCH) ───────────────────────────────────────────────────────────

export interface PromotionEditValues {
    name: string;
    description: string;
    valid_until: string;
    max_redemptions: string;
}

export const toDateTimeLocal = (value?: string | null): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const promotionEditValues = (promotion: AdminPromotion): PromotionEditValues => ({
    name: promotion.name,
    description: promotion.description ?? '',
    valid_until: toDateTimeLocal(promotion.valid_until),
    max_redemptions: promotion.max_redemptions ? String(promotion.max_redemptions) : '',
});

export type PromotionEditResult =
    | { success: true; patch: AdminPromotionPatch }
    | { success: false; errors: Partial<Record<keyof PromotionEditValues | 'form', string>> };

/**
 * Builds a PATCH with only the changed fields. Payment cannot clear an end
 * date or a cap through PATCH, so clearing them is refused here.
 */
export function buildPromotionPatch(promotion: AdminPromotion, values: PromotionEditValues, now: Date = new Date()): PromotionEditResult {
    const errors: Partial<Record<keyof PromotionEditValues | 'form', string>> = {};
    const patch: AdminPromotionPatch = { version: promotion.version };
    const name = promotionName.safeParse(values.name);
    if (!name.success) errors.name = name.error.issues[0]?.message;
    else if (name.data !== promotion.name) patch.name = name.data;
    const description = promotionDescription.safeParse(values.description);
    if (!description.success) errors.description = description.error.issues[0]?.message;
    else if (description.data !== (promotion.description ?? '')) patch.description = description.data;

    const until = values.valid_until.trim();
    if (until !== toDateTimeLocal(promotion.valid_until)) {
        const date = new Date(until);
        if (!until) errors.valid_until = 'An end date cannot be removed once set. Choose a later date instead.';
        else if (Number.isNaN(date.getTime())) errors.valid_until = 'End is not a valid date and time.';
        else if (promotion.valid_from && date.getTime() <= new Date(promotion.valid_from).getTime()) errors.valid_until = 'The end must be after the start.';
        else if (promotion.status === 'active' && date.getTime() <= now.getTime()) errors.valid_until = 'An active promotion needs an end in the future. Pause it to stop it now.';
        else patch.valid_until = date.toISOString();
    }

    const cap = values.max_redemptions.trim();
    if (cap !== (promotion.max_redemptions ? String(promotion.max_redemptions) : '')) {
        const parsedCap = redemptionCap.safeParse(cap);
        if (!cap) errors.max_redemptions = 'A cap cannot be removed once set. Enter a higher cap instead.';
        else if (!parsedCap.success) errors.max_redemptions = parsedCap.error.issues[0]?.message;
        else if (Number(cap) < promotion.redemption_count) errors.max_redemptions = `The cap cannot be below the ${promotion.redemption_count} uses so far.`;
        else patch.max_redemptions = Number(cap);
    }

    if (Object.keys(errors).length > 0) return { success: false, errors };
    if (Object.keys(patch).length === 1) return { success: false, errors: { form: 'Nothing has changed.' } };
    return { success: true, patch };
}

// ── Server errors ──────────────────────────────────────────────────────────

const ACTIVATION_REASON_MESSAGES: Record<string, string> = {
    offer_id_missing: 'Add a Razorpay offer ID for every selected market before activating this discount.',
    plan_unavailable: 'There is no approved plan for this tier (in each selected currency). Approve the plan version first.',
    price_not_divisible: 'The plan price cannot be discounted exactly in paise or pence. Use a plan whose price is a whole number of rupees or pounds.',
    window_ended: 'The end date has passed. Set a later end date before activating.',
    redemption_cap_reached: 'The usage cap has been reached. Raise the cap before activating.',
    invalid_terms: 'The promotion terms are not valid any more. Archive it and create a new one.',
};

export function getPromotionActivationReason(error: unknown): string | null {
    if (!(error instanceof ApiRequestError) || error.status !== 422 || error.code !== 'promotion_activation_invalid') return null;
    const data = error.data && typeof error.data === 'object' ? error.data as Record<string, unknown> : null;
    return typeof data?.reason === 'string' ? data.reason : null;
}

/** The admin-facing message for a failed promotion mutation. */
export function getPromotionErrorMessage(error: unknown): string {
    const reason = getPromotionActivationReason(error);
    if (reason) return ACTIVATION_REASON_MESSAGES[reason] ?? 'This promotion cannot be activated yet. Check its plan, offers, window and cap.';
    if (error instanceof ApiRequestError && error.status === 409) {
        return 'The promotion changed or conflicts with another one (for example a second active signup campaign or a reused code). Refresh and try again.';
    }
    return error instanceof Error && error.message ? error.message : 'The change could not be confirmed. Refresh before retrying.';
}

// ── List presentation ──────────────────────────────────────────────────────

export const formatPromotionBenefit = (promotion: Pick<AdminPromotion, 'kind' | 'trial_days' | 'percent_off' | 'discount_cycles'>): string => {
    if (promotion.kind === 'trial_grant') {
        const days = promotion.trial_days ?? 0;
        return `${days} ${days === 1 ? 'day' : 'days'}`;
    }
    const months = promotion.discount_cycles ?? 0;
    return `${promotion.percent_off ?? 0}% × ${months} ${months === 1 ? 'month' : 'months'}`;
};

export const formatPromotionUsage = (promotion: Pick<AdminPromotion, 'redemption_count' | 'max_redemptions'>): string =>
    `${promotion.redemption_count}/${promotion.max_redemptions ?? 'unlimited'}`;

export const formatPromotionPlan = (promotion: Pick<AdminPromotion, 'plan_code'>): string =>
    `${getManagerPlanDisplayName(promotion.plan_code)} (${promotion.plan_code})`;

export const formatPromotionKind = (kind: AdminPromotion['kind']): string =>
    kind === 'trial_grant' ? 'Trial' : 'Percent discount';

export const formatPromotionMarkets = (promotion: Pick<AdminPromotion, 'kind' | 'eligible_markets'>): string =>
    promotion.kind === 'trial_grant' ? 'All markets' : (promotion.eligible_markets ?? []).join(', ') || '—';

const ACTIONS_BY_STATUS: Record<AdminPromotionStatus, AdminPromotionAction[]> = {
    draft: ['activate', 'archive'],
    active: ['pause', 'archive'],
    paused: ['activate', 'archive'],
    archived: [],
};

export const getPromotionActions = (status: AdminPromotionStatus): AdminPromotionAction[] => ACTIONS_BY_STATUS[status] ?? [];

export const canEditPromotion = (promotion: Pick<AdminPromotion, 'status'>): boolean => promotion.status !== 'archived';

/** The single active auto-apply trial (payment enforces at most one per mode). */
export const findLaunchCampaign = (promotions: readonly AdminPromotion[]): AdminPromotion | null =>
    promotions.find((promotion) => promotion.kind === 'trial_grant' && promotion.auto_apply_on_signup && promotion.status === 'active') ?? null;

export const REDEMPTIONS_PAGE_SIZE = 50;

// ── Trial grants ───────────────────────────────────────────────────────────

export type AdminTrialGrantState = 'active' | 'expired' | 'superseded' | 'revoked';

/** Same precedence as payment managerTrialView: revoked, superseded, expired, active. */
export function getAdminTrialGrantState(grant: Pick<AdminTrialGrant, 'revoked_at' | 'superseded_at' | 'ends_at'>, now: Date): AdminTrialGrantState {
    if (grant.revoked_at) return 'revoked';
    if (grant.superseded_at) return 'superseded';
    return new Date(grant.ends_at).getTime() <= now.getTime() ? 'expired' : 'active';
}

/** Payment refuses to revoke a superseded trial, and a revoked one is already done. */
export const canRevokeTrialGrant = (grant: Pick<AdminTrialGrant, 'revoked_at' | 'superseded_at' | 'ends_at'>, now: Date): boolean => {
    const state = getAdminTrialGrantState(grant, now);
    return state === 'active' || state === 'expired';
};

export type RevokeReasonCheck = { ok: true; reason: string } | { ok: false; message: string };

export function checkRevokeReason(value: string): RevokeReasonCheck {
    const reason = value.trim();
    if (!reason) return { ok: false, message: 'Give a short reason for revoking this trial.' };
    if (utf8ByteLength(reason) > TRIAL_REVOKE_REASON_MAX) return { ok: false, message: `Keep the reason shorter (up to ${TRIAL_REVOKE_REASON_MAX} bytes).` };
    return { ok: true, reason };
}

export function describeBackfillResult(result: AdminTrialBackfillResult, formatDate: (value: string) => string): string {
    if (result.status === 'granted') {
        return `Trial granted until ${result.grant?.ends_at ? formatDate(result.grant.ends_at) : 'its end date'}.`;
    }
    if (result.status === 'already_granted') return 'This manager already has a launch trial. Nothing changed.';
    if (result.reason === 'existing_access') return 'Not granted: this manager already has paid access or an earlier trial. Nothing changed.';
    if (result.reason === 'promotion') return 'Not granted: no launch campaign can be used right now (paused, outside its window, or at its cap). Nothing changed.';
    return 'This manager is not eligible for the launch trial. Nothing changed.';
}

// ── Idempotency keys ───────────────────────────────────────────────────────

/**
 * One key per pending operation: a retry after a network failure reuses the
 * key, so payment replays the first result instead of acting twice. The key is
 * dropped after a confirmed result or when the operation's input changes.
 */
export function createIdempotencyKeys(generate: () => string = () => `web-${crypto.randomUUID()}`) {
    const keys = new Map<string, string>();
    return {
        keyFor(scope: string): string {
            let key = keys.get(scope);
            if (!key) {
                key = generate();
                keys.set(scope, key);
            }
            return key;
        },
        clear(scope: string) {
            keys.delete(scope);
        },
    };
}

/**
 * A definite client-side refusal (4xx) will not change on replay, so the next
 * attempt gets a fresh key. Network failures, timeouts and 5xx keep the key.
 */
export const shouldReuseIdempotencyKey = (error: unknown): boolean =>
    !(error instanceof ApiRequestError && typeof error.status === 'number' && error.status >= 400 && error.status < 500);
