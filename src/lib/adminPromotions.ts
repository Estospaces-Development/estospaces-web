import { z } from 'zod';

import { ApiRequestError } from './apiUtils';
import { getManagerPlanDisplayName } from './managerPlanNames';
import type {
    AdminPromotion,
    AdminPromotionAction,
    AdminPromotionDraft,
    AdminPromotionMarket,
    AdminPromotionRedemption,
    AdminPromotionStatus,
} from '../services/adminSubscriptionService';

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
    market_in: true,
    market_gb: false,
});

export const RAZORPAY_OFFER_ID_PATTERN = /^offer_[A-Za-z0-9]+$/;
export const PROMOTION_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
export const PERCENT_OFF_RANGE = { min: 1, max: 90 } as const;
export const DISCOUNT_CYCLES_RANGE = { min: 1, max: 24 } as const;
export const TRIAL_DAYS_RANGE = { min: 1, max: 365 } as const;

const wholeNumber = (label: string, min: number, max: number) => z.string().trim()
    .regex(/^\d+$/, `${label} must be a whole number.`)
    .transform(Number)
    .refine((value) => value >= min && value <= max, `${label} must be between ${min} and ${max}.`);

const localDateTime = (label: string) => z.string().trim()
    .refine((value) => value === '' || !Number.isNaN(new Date(value).getTime()), `${label} is not a valid date and time.`);

const offerID = (currency: string) => z.string().trim()
    .refine((value) => value === '' || RAZORPAY_OFFER_ID_PATTERN.test(value), `The ${currency} offer ID must look like offer_ followed by letters and numbers.`);

const baseShape = {
    name: z.string().trim().min(1, 'Enter a name admins will recognise.').max(120, 'Keep the name under 120 characters.'),
    description: z.string().trim().max(500, 'Keep the description under 500 characters.'),
    code: z.string().trim().transform((value) => value.toUpperCase())
        .refine((value) => value === '' || PROMOTION_CODE_PATTERN.test(value), 'Codes are 3–32 letters, numbers, hyphens or underscores.'),
    plan_code: z.enum(['pro', 'growth']),
    valid_from: localDateTime('Start').refine((value) => value !== '', 'Choose when the promotion starts.'),
    valid_until: localDateTime('End'),
    max_redemptions: z.string().trim()
        .refine((value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 1), 'The usage cap must be a whole number of at least 1, or empty for no cap.'),
    market_in: z.boolean(),
    market_gb: z.boolean(),
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
});

const promotionFormSchema = z.discriminatedUnion('kind', [trialSchema, discountSchema]).superRefine((value, ctx) => {
    if (!value.market_in && !value.market_gb) {
        ctx.addIssue({ code: 'custom', path: ['markets'], message: 'Choose at least one market.' });
    }
    if (value.valid_until && value.valid_from && new Date(value.valid_until).getTime() <= new Date(value.valid_from).getTime()) {
        ctx.addIssue({ code: 'custom', path: ['valid_until'], message: 'The end must be after the start.' });
    }
    if (value.kind === 'percent_discount') {
        if (!value.code) {
            ctx.addIssue({ code: 'custom', path: ['code'], message: 'Managers type this code at checkout, so a discount needs one.' });
        }
        if (value.market_in && !value.provider_offer_id_inr) {
            ctx.addIssue({ code: 'custom', path: ['provider_offer_id_inr'], message: 'India is selected, so paste the INR Razorpay offer ID.' });
        }
        if (value.market_gb && !value.provider_offer_id_gbp) {
            ctx.addIssue({ code: 'custom', path: ['provider_offer_id_gbp'], message: 'United Kingdom is selected, so paste the GBP Razorpay offer ID.' });
        }
    }
});

export type PromotionFormResult =
    | { success: true; draft: AdminPromotionDraft }
    | { success: false; errors: PromotionFormErrors };

const optional = <T,>(value: T | '' | undefined): T | undefined => value === '' ? undefined : value;

/** Validates the create form and builds the exact payment request body. */
export function buildPromotionDraft(values: PromotionFormValues): PromotionFormResult {
    const parsed = promotionFormSchema.safeParse(values);
    if (!parsed.success) {
        const errors: PromotionFormErrors = {};
        for (const issue of parsed.error.issues) {
            const field = issue.path[0] as PromotionFormField | undefined;
            if (field && !errors[field]) errors[field] = issue.message;
        }
        return { success: false, errors };
    }
    const value = parsed.data;
    const markets: AdminPromotionMarket[] = [];
    if (value.market_in) markets.push('IN');
    if (value.market_gb) markets.push('GB');
    const base = {
        name: value.name,
        description: optional(value.description),
        code: optional(value.code),
        plan_code: value.plan_code,
        valid_from: new Date(value.valid_from).toISOString(),
        valid_until: value.valid_until ? new Date(value.valid_until).toISOString() : undefined,
        max_redemptions: value.max_redemptions ? Number(value.max_redemptions) : undefined,
        eligible_markets: markets,
    };
    if (value.kind === 'trial_grant') {
        return {
            success: true,
            draft: { ...base, kind: 'trial_grant', trial_days: value.trial_days, auto_apply_on_signup: value.auto_apply_on_signup },
        };
    }
    return {
        success: true,
        draft: {
            ...base,
            kind: 'percent_discount',
            percent_off: value.percent_off,
            discount_cycles: value.discount_cycles,
            // Only the offers for the chosen markets are sent.
            provider_offer_id_inr: value.market_in ? value.provider_offer_id_inr : undefined,
            provider_offer_id_gbp: value.market_gb ? value.provider_offer_id_gbp : undefined,
        },
    };
}

export const RAZORPAY_OFFER_STEPS: readonly string[] = [
    'Open the Razorpay Dashboard in the same mode as this environment (Test mode for dev).',
    'Go to Offers and create a new offer for subscriptions.',
    'Set a percentage discount equal to the percent below, and limit it to the same number of billing cycles as the discounted months below.',
    'Link it to the Razorpay plan for this tier. Create one offer for the INR plan and, if the UK is selected, a second offer for the GBP plan.',
    'Copy each offer ID (it starts with offer_) and paste it below. Payment checks that Razorpay echoes the same offer on every checkout.',
];

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

const ACTIONS_BY_STATUS: Record<AdminPromotionStatus, AdminPromotionAction[]> = {
    draft: ['activate', 'archive'],
    active: ['pause', 'archive'],
    paused: ['activate', 'archive'],
    archived: [],
};

export const getPromotionActions = (status: AdminPromotionStatus): AdminPromotionAction[] => ACTIONS_BY_STATUS[status] ?? [];

/** The single active auto-apply trial (payment enforces at most one per mode). */
export const findLaunchCampaign = (promotions: readonly AdminPromotion[]): AdminPromotion | null =>
    promotions.find((promotion) => promotion.kind === 'trial_grant' && promotion.auto_apply_on_signup && promotion.status === 'active') ?? null;

export const canRevokeTrialRedemption = (redemption: AdminPromotionRedemption): boolean =>
    redemption.kind === 'trial_grant' && Boolean(redemption.trial_grant_id) && redemption.status === 'applied';

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
