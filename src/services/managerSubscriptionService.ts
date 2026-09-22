import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const PAYMENT_URL = () => getServiceUrl('payment');

export interface ManagerPlanOffer {
    id: string;
    code: 'pro' | 'growth';
    version: number;
    amount_minor: number;
    currency: 'INR' | 'GBP';
    billing_period: 'monthly';
    billing_interval: number;
    total_cycles: number;
    published_property_limit: number;
    active_case_limit: number;
    image_upload_limit_bytes: number;
    support_level: 'standard' | 'dedicated';
    featured: boolean;
    lead_delivery_policy: string;
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
    state: 'free_active' | 'paid_active' | 'pilot_active' | 'expired';
    source: 'free' | 'paid' | 'pilot';
    ends_at?: string;
    reason: string;
    published_property_limit: ManagerSubscriptionResourceLimit;
    active_case_limit: ManagerSubscriptionResourceLimit;
    support_level: 'basic' | 'standard' | 'dedicated';
}

export interface ManagerSubscriptionSummary {
    mode: 'test' | 'live';
    entitlement?: ManagerSubscriptionEntitlement | null;
    checkout?: SubscriptionCheckout | null;
    subscription?: { status: string; current_end?: number; paid_count?: number } | null;
    cancellation?: { status: 'requesting' | 'reconciliation_required' | 'failed' | 'confirmed'; confirmed_at?: string } | null;
    paid_period?: { billing_start?: string; billing_end?: string } | null;
    new_paid_actions_available: boolean;
    new_checkouts_paused?: boolean;
}

export interface StartCheckoutResponse {
    checkout: SubscriptionCheckout;
    terms: AcceptedSubscriptionTerms;
    key_id: string;
}

export function getManagerSubscriptionOffers() {
    return apiFetch<ManagerPlanOffer[]>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/offers`);
}

export function getManagerSubscriptionSummary() {
    return apiFetch<{ account: ManagerSubscriptionSummary; key_id: string }>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/`);
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

export function startManagerSubscriptionCheckout(input: {
    plan_version_id: string;
    idempotency_key: string;
    terms_digest: string;
    consent_version: string;
    recurring_consent: boolean;
}) {
    return apiFetch<StartCheckoutResponse>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/checkouts`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function verifyManagerSubscriptionCheckout(checkoutId: string, input: { payment_id: string; signature: string }) {
    return apiFetch<{ payment: unknown; account: ManagerSubscriptionSummary }>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/checkouts/${checkoutId}/verify`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}
