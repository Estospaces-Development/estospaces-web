import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const paymentURL = () => getServiceUrl('payment');
const baseURL = () => `${paymentURL()}/api/v1/admin/subscriptions`;

export interface AdminSubscriptionPlan {
    id: string;
    code: 'pro' | 'growth';
    version: number;
    amount_minor: number;
    tax_minor: number;
    currency: 'INR' | 'GBP';
    billing_period: 'monthly';
    billing_interval: number;
    total_cycles: number;
    published_property_limit: number;
    active_case_limit: number;
    image_upload_limit_bytes: number;
    support_level: 'standard' | 'dedicated';
    featured: boolean;
    lead_delivery_policy: 'best_effort';
    tax_inclusive: boolean;
    terms_schema_version: number;
    terms_version: string;
    terms_text: string;
    terms_digest: string;
    provider_plan_id?: string;
    approved_at?: string;
    retired_at?: string;
}

export interface AdminSubscriptionPlanDraft {
    code: 'pro' | 'growth';
    version: number;
    provider_plan_id: string;
    amount_minor: number;
    tax_minor: number;
    currency: 'INR';
    billing_period: 'monthly';
    billing_interval: 1;
    total_cycles: 12;
    published_property_limit: number;
    property_upload_bytes: 0;
    supplied_leads: 0;
    leads_per_property: false;
    fast_track_discount_bps: 0;
    support_level: 'standard' | 'dedicated';
    featured: boolean;
    terms_schema_version: 2;
    image_upload_limit_bytes: 52000000;
    active_case_limit: number;
    lead_delivery_policy: 'best_effort';
    tax_inclusive: true;
    terms_version: string;
    terms_text: string;
}

export interface AdminPilotCoupon {
    id: string;
    campaign: string;
    manager_id: string;
    created_by: string;
    expires_at: string;
    revoked_at?: string;
    redeemed_at?: string;
}

export interface AdminPilotPromotion {
    id: string;
    slot: number;
    status: 'requested' | 'scheduled' | 'completed';
}

export interface AdminPilotGrantView {
    grant: { id: string; manager_id: string; campaign: string; starts_at: string; ends_at: string };
    promotions: AdminPilotPromotion[];
}

export function getAdminSubscriptionPlans() {
    return apiFetch<AdminSubscriptionPlan[]>(`${baseURL()}/plans?limit=100`);
}

export function createAdminSubscriptionPlan(input: AdminSubscriptionPlanDraft) {
    return apiFetch<AdminSubscriptionPlan>(`${baseURL()}/plans`, { method: 'POST', body: JSON.stringify(input) });
}

export function approveAdminSubscriptionPlan(planID: string, termsDigest: string) {
    return apiFetch<AdminSubscriptionPlan>(`${baseURL()}/plans/${encodeURIComponent(planID)}/approve`, {
        method: 'POST', body: JSON.stringify({ terms_digest: termsDigest }),
    });
}

export function retireAdminSubscriptionPlan(planID: string) {
    return apiFetch<{ retired: boolean }>(`${baseURL()}/plans/${encodeURIComponent(planID)}/retire`, { method: 'POST' });
}

export function getAdminPilotCoupons() {
    return apiFetch<AdminPilotCoupon[]>(`${baseURL()}/pilot-coupons?limit=100`);
}

export function issueAdminPilotCoupon(input: { manager_id: string; campaign: string; expires_at: string }) {
    return apiFetch<{ coupon: AdminPilotCoupon; code: string }>(`${baseURL()}/pilot-coupons`, { method: 'POST', body: JSON.stringify(input) });
}

export function revokeAdminPilotCoupon(couponID: string) {
    return apiFetch<{ revoked: boolean }>(`${baseURL()}/pilot-coupons/${encodeURIComponent(couponID)}/revoke`, { method: 'POST' });
}

export function getAdminPilotGrants() {
    return apiFetch<AdminPilotGrantView[]>(`${baseURL()}/pilot-grants?limit=100`);
}

export function scheduleAdminPilotPromotion(promotionID: string, scheduledAt: string) {
    return apiFetch<AdminPilotPromotion>(`${baseURL()}/pilot-promotions/${encodeURIComponent(promotionID)}/schedule`, {
        method: 'POST', body: JSON.stringify({ scheduled_at: scheduledAt }),
    });
}

export function completeAdminPilotPromotion(promotionID: string, evidenceReference: string) {
    return apiFetch<AdminPilotPromotion>(`${baseURL()}/pilot-promotions/${encodeURIComponent(promotionID)}/complete`, {
        method: 'POST', body: JSON.stringify({ evidence_reference: evidenceReference }),
    });
}
