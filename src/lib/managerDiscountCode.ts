import type { ManagerDiscountPreview, ManagerPlanOffer, SubscriptionCheckoutPrice } from '../services/managerSubscriptionService';
import { formatMinorCurrency, subscriptionGrossMinor } from './managerSubscriptionCheckout';

// Percent-discount codes at manager checkout (payment PR #25). The server is
// the only source of the price: the browser shows the preview it returned,
// checks it is self-consistent, and sends the digest back with checkout.

// Mirrors payment's promotionCodePattern after upper-casing.
const DISCOUNT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const PRICE_DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const MAX_PERCENT_OFF = 90;
const MAX_DISCOUNT_CYCLES = 24;

export const DISCOUNT_CODE_UNAVAILABLE_MESSAGE = "This code can't be used on this plan.";
export const DISCOUNT_CODE_RATE_LIMITED_MESSAGE = 'Too many code attempts. Please wait a few minutes and try again.';
export const DISCOUNT_PRICE_CHANGED_MESSAGE = 'The discount for this code has changed. Check the new price and confirm the payment consent again. Nothing was charged.';

/** Trims and upper-cases a typed or linked code; null when it can never be valid. */
export function normalizeDiscountCode(raw: string | null | undefined): string | null {
    const value = String(raw ?? '').trim().toUpperCase();
    return DISCOUNT_CODE_PATTERN.test(value) ? value : null;
}

/**
 * base × (100 − p) / 100 in integer minor units, the payment service's
 * formula. Null for any input where the server would refuse the discount
 * (base not a whole number of rupees/pounds, percent outside 1–90).
 */
export function discountedAmountMinor(baseMinor: number, percentOff: number): number | null {
    if (!Number.isSafeInteger(baseMinor) || baseMinor <= 0 || baseMinor % 100 !== 0) return null;
    if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > MAX_PERCENT_OFF) return null;
    return (baseMinor / 100) * (100 - percentOff);
}

type DiscountTerms = Pick<SubscriptionCheckoutPrice, 'percent_off' | 'discount_cycles' | 'discounted_amount_minor' | 'full_amount_minor' | 'currency'>;

const monthCount = (months: number) => `${months} ${months === 1 ? 'month' : 'months'}`;
const money = (amountMinor: number, currency: string) => formatMinorCurrency(amountMinor, currency, { trimWholeUnits: true });

/** "20% off for 3 months: ₹799.20/month, then ₹999/month" */
export function describeDiscountPrice(terms: DiscountTerms): string {
    return `${terms.percent_off}% off for ${monthCount(terms.discount_cycles)}: ${money(terms.discounted_amount_minor, terms.currency)}/month, then ${money(terms.full_amount_minor, terms.currency)}/month`;
}

export const DEFAULT_RECURRING_CONSENT_TEXT = 'I understand this is a monthly recurring subscription, the displayed tax-inclusive amount, and the cancellation terms before payment.';

/** The consent names both amounts and the month count whenever a code is applied. */
export function getRecurringConsentText(discount?: { planName: string; terms: DiscountTerms } | null): string {
    if (!discount) return DEFAULT_RECURRING_CONSENT_TEXT;
    const { planName, terms } = discount;
    const firstMonths = terms.discount_cycles === 1 ? 'for the first month' : `for the first ${terms.discount_cycles} months`;
    return `I understand this is a monthly recurring ${planName} subscription: ${money(terms.discounted_amount_minor, terms.currency)} a month ${firstMonths}, then ${money(terms.full_amount_minor, terms.currency)} a month, tax inclusive, and the cancellation terms before payment.`;
}

/**
 * A preview is shown only when it describes exactly this offer and its own
 * numbers agree. Anything else is treated as unavailable rather than showing
 * a price the checkout would not charge.
 */
export function previewMatchesOffer(preview: ManagerDiscountPreview, offer: Pick<ManagerPlanOffer, 'id' | 'currency' | 'amount_minor' | 'tax_minor' | 'tax_inclusive'>, code: string): boolean {
    return preview.code === code
        && preview.plan_version_id === offer.id
        && preview.currency === offer.currency
        && preview.full_amount_minor === subscriptionGrossMinor(offer)
        && Number.isInteger(preview.discount_cycles) && preview.discount_cycles >= 1 && preview.discount_cycles <= MAX_DISCOUNT_CYCLES
        && discountedAmountMinor(preview.full_amount_minor, preview.percent_off) === preview.discounted_amount_minor
        && PRICE_DIGEST_PATTERN.test(preview.price_digest);
}

/** A code applied to one plan offer, with the preview the manager is shown. */
export interface AppliedDiscount {
    offerId: string;
    code: string;
    preview: ManagerDiscountPreview;
}

export type CheckoutPromotionFields =
    | { promotion_code?: undefined; price_digest?: undefined }
    | { promotion_code: string; price_digest: string };

/**
 * Enforces the both-or-neither rule before the request leaves the browser.
 * Returns whether the checkout carries a discount.
 */
export function assertCheckoutPromotionPair(fields: { promotion_code?: string; price_digest?: string }): boolean {
    const hasCode = fields.promotion_code !== undefined && fields.promotion_code !== '';
    const hasDigest = fields.price_digest !== undefined && fields.price_digest !== '';
    if (hasCode !== hasDigest) throw new Error('A discount code must be sent with its price digest. Apply the code again before paying.');
    return hasCode;
}

export type DiscountCheckoutPlan =
    | { kind: 'full_price'; fields: CheckoutPromotionFields }
    | { kind: 'discounted'; fields: CheckoutPromotionFields }
    | { kind: 'other_plan'; code: string; offerId: string };

/**
 * Decides what a checkout for `offerId` sends. A code applied to a different
 * plan never silently disappears: the manager must move or remove it.
 */
export function planDiscountCheckout(applied: AppliedDiscount | null, offerId: string): DiscountCheckoutPlan {
    if (!applied) return { kind: 'full_price', fields: {} };
    if (applied.offerId !== offerId) return { kind: 'other_plan', code: applied.code, offerId: applied.offerId };
    return { kind: 'discounted', fields: { promotion_code: applied.code, price_digest: applied.preview.price_digest } };
}

export function describeOtherPlanDiscount(code: string, appliedPlanName: string, chosenPlanName: string): string {
    return `Code ${code} is applied to ${appliedPlanName}. Apply it to ${chosenPlanName} or remove it before continuing.`;
}

export type DiscountErrorKind = 'unavailable' | 'stale' | 'rate_limited' | 'other';

export function classifyDiscountError(error: unknown): DiscountErrorKind {
    const { status, code } = (error && typeof error === 'object' ? error : {}) as { status?: unknown; code?: unknown };
    if (status === 429) return 'rate_limited';
    if (status === 409 && code === 'promotion_preview_stale') return 'stale';
    if (status === 409 && code === 'promotion_unavailable') return 'unavailable';
    return 'other';
}

export const CHECKOUT_FAILED_TRY_AGAIN_MESSAGE = 'Secure checkout could not be set up, and nothing was charged. Please try again.';

/**
 * A 503 provider_unavailable that carries a checkout already marked failed
 * (for example the provider did not echo the discount offer). The server has
 * released it, so the manager can simply try again; a retry always starts a
 * new checkout with a new idempotency key and never reuses this checkout ID.
 * Other 503s may have an unknown outcome and keep the server's own message.
 */
export function isFailedCheckoutError(error: unknown): boolean {
    const { status, code, data } = (error && typeof error === 'object' ? error : {}) as { status?: unknown; code?: unknown; data?: unknown };
    if (status !== 503 || code !== 'provider_unavailable' || !data || typeof data !== 'object') return false;
    const checkout = (data as { checkout?: unknown }).checkout;
    return Boolean(checkout && typeof checkout === 'object' && (checkout as { status?: unknown }).status === 'failed');
}

export type StaleRecoveryOutcome =
    | { kind: 'confirm_new_price'; applied: AppliedDiscount }
    | { kind: 'unavailable' }
    | { kind: 'rate_limited' }
    | { kind: 'failed'; error: unknown };

/**
 * After checkout answers promotion_preview_stale, preview the same code for
 * the same plan exactly once. It never starts a checkout itself: a changed
 * price always goes back to the manager to confirm.
 */
export async function recoverFromStalePreview(
    applied: AppliedDiscount,
    offer: Parameters<typeof previewMatchesOffer>[1],
    preview: (code: string, planVersionId: string) => Promise<ManagerDiscountPreview>,
): Promise<StaleRecoveryOutcome> {
    try {
        const fresh = await preview(applied.code, offer.id);
        if (!previewMatchesOffer(fresh, offer, applied.code)) return { kind: 'unavailable' };
        return { kind: 'confirm_new_price', applied: { offerId: offer.id, code: applied.code, preview: fresh } };
    } catch (error) {
        const kind = classifyDiscountError(error);
        if (kind === 'unavailable') return { kind: 'unavailable' };
        if (kind === 'rate_limited') return { kind: 'rate_limited' };
        return { kind: 'failed', error };
    }
}

// ── ?coupon= prefill, kept per account for this browser tab ───────────────

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_PREFIX = 'esto.manager.discount-code.v1:';
export const COUPON_QUERY_PARAM = 'coupon';

const storageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

/** The code from a `?coupon=` link, normalized; null when absent or malformed. */
export function readCouponParam(search: string | URLSearchParams): string | null {
    const params = typeof search === 'string' ? new URLSearchParams(search) : search;
    return normalizeDiscountCode(params.get(COUPON_QUERY_PARAM));
}

export function rememberDiscountCode(storage: KeyValueStorage | null | undefined, userId: string | null | undefined, code: string): void {
    const normalized = normalizeDiscountCode(code);
    if (!storage || !userId || !normalized) return;
    try { storage.setItem(storageKey(userId), normalized); } catch { /* Storage full or blocked: the field still works. */ }
}

export function readRememberedDiscountCode(storage: KeyValueStorage | null | undefined, userId: string | null | undefined): string | null {
    if (!storage || !userId) return null;
    try { return normalizeDiscountCode(storage.getItem(storageKey(userId))); } catch { return null; }
}

export function forgetDiscountCode(storage: KeyValueStorage | null | undefined, userId: string | null | undefined): void {
    if (!storage || !userId) return;
    try { storage.removeItem(storageKey(userId)); } catch { /* Nothing to clear. */ }
}

/**
 * Picks the code to pre-fill: a valid `?coupon=` link wins and is remembered
 * for this account; otherwise the code this account remembered earlier.
 */
export function resolveDiscountCodePrefill(search: string | URLSearchParams, storage: KeyValueStorage | null | undefined, userId: string | null | undefined): string | null {
    const linked = readCouponParam(search);
    if (linked) {
        rememberDiscountCode(storage, userId, linked);
        return linked;
    }
    return readRememberedDiscountCode(storage, userId);
}
