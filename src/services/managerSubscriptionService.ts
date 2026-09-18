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
}

export interface SubscriptionCheckout {
    id: string;
    plan_version_id: string;
    terms_digest: string;
    consent_version: string;
    provider_subscription_id?: string;
    status: string;
}

export interface ManagerSubscriptionSummary {
    mode: 'test' | 'live';
    checkout?: SubscriptionCheckout | null;
    subscription?: { status: string; current_end?: number; paid_count?: number } | null;
    paid_period?: { billing_start?: string; billing_end?: string } | null;
    new_paid_actions_available: boolean;
}

export interface StartCheckoutResponse {
    checkout: SubscriptionCheckout;
    terms: ManagerPlanOffer;
    key_id: string;
}

export function getManagerSubscriptionOffers() {
    return apiFetch<ManagerPlanOffer[]>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/offers`);
}

export function getManagerSubscriptionSummary() {
    return apiFetch<{ account: ManagerSubscriptionSummary; key_id: string }>(`${PAYMENT_URL()}/api/v1/manager/subscriptions/`);
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
