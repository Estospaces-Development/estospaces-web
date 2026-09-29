import { apiFetch, getServiceUrl, type ApiFetchOptions } from '@/lib/apiUtils';
import { assertCheckoutPromotionPair, type CheckoutPromotionFields } from '@/lib/managerDiscountCode';

const PAYMENT_URL = () => getServiceUrl('payment');

export interface ManagerPlanPreview {
    code: 'pro' | 'growth';
    published_property_limit: number;
    active_case_limit: number;
    image_upload_limit_bytes: number;
    support_level: 'standard' | 'dedicated';
    featured: boolean;
    lead_delivery_policy: string;
}

export interface ManagerPlanOffer extends ManagerPlanPreview {
    id: string;
    version: number;
    amount_minor: number;
    currency: 'INR' | 'GBP';
    billing_period: 'monthly';
    billing_interval: number;
    total_cycles: number;
    tax_inclusive: boolean;
    terms_version: string;
    terms_text: string;
    terms_digest: string;
    tax_minor?: number;
}

// Accepted historical snapshots can predate per-image/case limits and inclusive tax.
export type AcceptedSubscriptionTerms = Pick<ManagerPlanOffer,
    'id' | 'code' | 'amount_minor' | 'currency' | 'billing_period' | 'billing_interval' | 'total_cycles' | 'terms_version' | 'terms_text'>
    & { tax_minor?: number; tax_inclusive?: boolean };

export interface SubscriptionCheckout {
    id: string;
    plan_version_id: string;
    terms_digest: string;
    consent_version: string;
    provider_subscription_id?: string;
    status: string;
}

export interface ManagerSubscriptionResourceLimit {
    kind: 'finite' | 'unlimited';
    value?: number;
}

export interface ManagerSubscriptionEntitlement {
    state: 'free_active' | 'paid_active' | 'trial_active' | 'pilot_active' | 'expired';
    source: 'free' | 'paid' | 'trial' | 'pilot';
    ends_at?: string;
    reason: string;
    published_property_limit: ManagerSubscriptionResourceLimit;
    active_case_limit: ManagerSubscriptionResourceLimit;
    support_level: 'basic' | 'standard' | 'dedicated';
}

// Launch trial grant (payment schema v9). A trial never calls Razorpay and is
// never charged; `superseded` means a paid period replaced it.
export type ManagerSubscriptionTrialState = 'active' | 'expired' | 'superseded' | 'revoked';

export interface ManagerSubscriptionTrial {
    plan_code: string;
    plan_name: string;
    starts_at: string;
    ends_at: string;
    days_remaining: number;
    state: ManagerSubscriptionTrialState;
}

export interface ManagerSubscriptionSummary {
    mode: 'test' | 'live';
    entitlement?: ManagerSubscriptionEntitlement | null;
    trial?: ManagerSubscriptionTrial | null;
    checkout?: SubscriptionCheckout | null;
    subscription?: { status: string; current_end?: number; paid_count?: number } | null;
    cancellation?: { status: 'requesting' | 'reconciliation_required' | 'failed' | 'confirmed'; confirmed_at?: string } | null;
    paid_period?: { billing_start?: string; billing_end?: string } | null;
    new_paid_actions_available: boolean;
    new_checkouts_paused?: boolean;
}

// The percent discount a checkout was accepted at (payment PR #25). Null or
// absent means full price. Amounts are integer minor units.
export interface SubscriptionCheckoutPrice {
    promotion_code: string;
    percent_off: number;
    discount_cycles: number;
    discounted_amount_minor: number;
    full_amount_minor: number;
    currency: 'INR' | 'GBP';
    price_digest: string;
}

// GET /promotions/preview: a quote for one code on one plan version. Every
// refusal is the same 409 promotion_unavailable.
export interface ManagerDiscountPreview {
    code: string;
    plan_version_id: string;
    percent_off: number;
    discount_cycles: number;
    discounted_amount_minor: number;
    full_amount_minor: number;
    currency: 'INR' | 'GBP';
    price_digest: string;
    valid_until: string | null;
}

export interface StartCheckoutResponse {
    checkout: SubscriptionCheckout;
    terms: AcceptedSubscriptionTerms;
    key_id: string;
    price?: SubscriptionCheckoutPrice | null;
}

export function getManagerSubscriptionOffers() {
    return apiFetch<ManagerPlanOffer[]>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/offers`);
}

export function getManagerSubscriptionPlanPreviews() {
    return apiFetch<ManagerPlanPreview[]>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/plan-previews`);
}

export function getManagerSubscriptionSummary(options: Pick<ApiFetchOptions, 'timeoutMs' | 'suppressErrorToast'> = {}) {
    return apiFetch<{ account: ManagerSubscriptionSummary; key_id: string }>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/`, options);
}

export function getManagerSubscriptionCheckout(checkoutId: string) {
    return apiFetch<StartCheckoutResponse>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/checkouts/${encodeURIComponent(checkoutId)}`);
}

export function recoverManagerSubscriptionCheckout(checkoutId: string) {
    return apiFetch<StartCheckoutResponse>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/checkouts/${encodeURIComponent(checkoutId)}/recover`, { method: 'POST' });
}

export function reconcileManagerSubscriptionCheckout(checkoutId: string) {
    return apiFetch<NonNullable<ManagerSubscriptionSummary['subscription']>>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/checkouts/${encodeURIComponent(checkoutId)}/reconcile`, { method: 'POST' });
}

export function cancelManagerSubscriptionCheckout(checkoutId: string) {
    return apiFetch<NonNullable<ManagerSubscriptionSummary['cancellation']>>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/checkouts/${encodeURIComponent(checkoutId)}/cancel`, { method: 'POST' });
}

export function previewManagerSubscriptionDiscount(code: string, planVersionId: string) {
    const query = new URLSearchParams({ code, plan_version_id: planVersionId });
    // The page explains refusals next to the field; a generic toast would contradict it.
    return apiFetch<ManagerDiscountPreview>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/promotions/preview?${query.toString()}`, { suppressErrorToast: true });
}

export function startManagerSubscriptionCheckout(input: {
    plan_version_id: string;
    idempotency_key: string;
    terms_digest: string;
    consent_version: string;
    recurring_consent: boolean;
} & CheckoutPromotionFields) {
    // promotion_code and price_digest travel together or not at all.
    const discounted = assertCheckoutPromotionPair(input);
    return apiFetch<StartCheckoutResponse>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/checkouts`, {
        method: 'POST',
        body: JSON.stringify(input),
        // Discount refusals (stale preview, unavailable code) are explained on the page.
        suppressErrorToast: discounted,
    });
}

export function verifyManagerSubscriptionCheckout(checkoutId: string, input: { payment_id: string; signature: string }) {
    return apiFetch<{ payment: unknown; account: ManagerSubscriptionSummary }>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/checkouts/${checkoutId}/verify`, {
        method: 'POST',
        body: JSON.stringify(input),
        // The page reports failures itself; a pending charge (409) is not an error there.
        suppressErrorToast: true,
    });
}

// A verified, paid billing period (payment-service PaidPeriod).
export interface ManagerPaidPeriod {
    mode: 'test' | 'live';
    invoice_id: string;
    payment_id: string;
    checkout_id: string;
    amount_minor: number;
    currency: string;
    refunded_minor: number;
    billing_start: string;
    billing_end: string;
    status: string;
    verified_at: string;
}

export function getManagerSubscriptionPaidPeriods(limit = 12, offset = 0) {
    return apiFetch<ManagerPaidPeriod[]>(
        `${PAYMENT_URL()}/api/v1/manager/subscriptions/invoices?limit=${limit}&offset=${offset}`,
        { suppressErrorToast: true },
    );
}
// payment-service GET /manager/subscriptions/pilot (PilotStatus). The grant is
// present only while it is active; it never contains the coupon code or hash.
export interface ManagerPilotGrant {
    campaign: string;
    starts_at: string;
    ends_at: string;
}

export interface ManagerPilotPromotion {
    slot: number;
    status: 'requested' | 'scheduled' | 'completed';
    scheduled_at?: string;
    completed_at?: string;
}

export interface ManagerPilotStatus {
    grant?: ManagerPilotGrant | null;
    promotions: ManagerPilotPromotion[];
}

export function getManagerPilotStatus() {
    return apiFetch<ManagerPilotStatus>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/pilot`, { suppressErrorToast: true });
}

// Redeeming the same coupon again returns the original grant, so a retry after
// an unclear result cannot create a second pilot. The page reports errors itself.
export function redeemManagerPilotCoupon(code: string) {
    return apiFetch<ManagerPilotGrant>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/pilot/redeem`, {
        method: 'POST',
        body: JSON.stringify({ code }),
        suppressErrorToast: true,
    });
}
