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

// POST /plans body. Payment decodes it strictly (unknown fields are rejected)
// into PlanVersion plus provider_plan_id, then validates schema v2 terms.
// Terms schema v2 requires the four legacy fields to be zero or false.
export interface AdminSubscriptionPlanDraft {
    code: 'pro' | 'growth';
    version: number;
    provider_plan_id: string;
    amount_minor: number;
    tax_minor: number;
    currency: 'INR' | 'GBP';
    billing_period: 'monthly';
    billing_interval: number;
    total_cycles: number;
    published_property_limit: number;
    property_upload_bytes: 0;
    supplied_leads: 0;
    leads_per_property: false;
    fast_track_discount_bps: 0;
    support_level: 'standard' | 'dedicated';
    featured: boolean;
    terms_schema_version: number;
    image_upload_limit_bytes: number;
    active_case_limit: number;
    lead_delivery_policy: 'best_effort';
    tax_inclusive: boolean;
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

// ── Launch promotions (payment schema v9) ───────────────────────────────────
// Wire shapes mirror payment internal/subscriptions (promotion.go, trial.go).
// Payment decodes admin bodies strictly (unknown fields are rejected), so
// drafts carry only the fields that apply to their kind.

export type AdminPromotionKind = 'trial_grant' | 'percent_discount';
export type AdminPromotionStatus = 'draft' | 'active' | 'paused' | 'archived';
export type AdminPromotionMarket = 'IN' | 'GB';
export type AdminPromotionPlanCode = 'pro' | 'growth';

export interface AdminPromotion {
    id: string;
    mode: 'test' | 'live';
    kind: AdminPromotionKind;
    status: AdminPromotionStatus;
    code?: string | null;
    name: string;
    description?: string | null;
    plan_code: AdminPromotionPlanCode;
    plan_version_id?: string | null;
    trial_days?: number | null;
    percent_off?: number | null;
    discount_cycles?: number | null;
    provider_offer_id_inr?: string | null;
    provider_offer_id_gbp?: string | null;
    auto_apply_on_signup: boolean;
    valid_from?: string | null;
    valid_until?: string | null;
    max_redemptions?: number | null;
    redemption_count: number;
    /** Always empty for trials: a trial is granted before any billing market is known. */
    eligible_markets: AdminPromotionMarket[];
    created_by?: string;
    activated_by?: string | null;
    activated_at?: string | null;
    created_at?: string;
    updated_at?: string;
    version: number;
}

interface AdminPromotionDraftBase {
    name: string;
    description?: string;
    code?: string;
    plan_code: AdminPromotionPlanCode;
    valid_from?: string;
    valid_until?: string;
    max_redemptions?: number;
}

/** Payment rejects a trial that carries markets, offers or discount fields. */
export interface AdminTrialGrantPromotionDraft extends AdminPromotionDraftBase {
    kind: 'trial_grant';
    trial_days: number;
    auto_apply_on_signup: boolean;
}

/** A discount needs a code and at least one market; offers may follow before activation. */
export interface AdminPercentDiscountPromotionDraft extends AdminPromotionDraftBase {
    kind: 'percent_discount';
    code: string;
    percent_off: number;
    discount_cycles: number;
    eligible_markets: AdminPromotionMarket[];
    provider_offer_id_inr?: string;
    provider_offer_id_gbp?: string;
}

export type AdminPromotionDraft = AdminTrialGrantPromotionDraft | AdminPercentDiscountPromotionDraft;

/** Only operational fields can change; `version` must match the stored row. */
export interface AdminPromotionPatch {
    version: number;
    name?: string;
    description?: string;
    valid_until?: string;
    max_redemptions?: number;
}

export type AdminPromotionRedemptionStatus = 'reserved' | 'applied' | 'released' | 'revoked';

export interface AdminPromotionRedemption {
    id: string;
    mode: 'test' | 'live';
    promotion_id: string;
    manager_id: string;
    kind: AdminPromotionKind;
    source: 'signup_auto' | 'manager_code' | 'admin_grant';
    status: AdminPromotionRedemptionStatus;
    trial_grant_id?: string | null;
    checkout_id?: string | null;
    created_at: string;
    updated_at?: string;
}

export interface AdminTrialGrant {
    id: string;
    mode: 'test' | 'live';
    manager_id: string;
    promotion_id: string;
    redemption_id: string;
    plan_code: string;
    plan_name: string;
    starts_at: string;
    ends_at: string;
    superseded_at?: string | null;
    superseded_by_checkout_id?: string | null;
    revoked_at?: string | null;
    revoked_by?: string | null;
    revoke_reason?: string | null;
    created_at: string;
}

export type AdminTrialBackfillNotEligibleReason = 'promotion' | 'existing_access';

export interface AdminTrialBackfillResult {
    status: 'granted' | 'already_granted' | 'not_eligible';
    grant?: AdminTrialGrant | null;
    reason?: AdminTrialBackfillNotEligibleReason | string;
}

export type AdminPromotionAction = 'activate' | 'pause' | 'archive';

const promotionsURL = () => `${baseURL()}/promotions`;
const idempotencyHeaders = (idempotencyKey: string) => ({ 'Idempotency-Key': idempotencyKey });
const page = (limit: number, offset: number) => `limit=${limit}&offset=${offset}`;

export function getAdminPromotions() {
    return apiFetch<AdminPromotion[]>(`${promotionsURL()}?limit=100`);
}

export function createAdminPromotion(input: AdminPromotionDraft, idempotencyKey: string) {
    return apiFetch<AdminPromotion>(promotionsURL(), {
        method: 'POST', headers: idempotencyHeaders(idempotencyKey), body: JSON.stringify(input),
    });
}

export function patchAdminPromotion(promotionID: string, patch: AdminPromotionPatch, idempotencyKey: string) {
    return apiFetch<AdminPromotion>(`${promotionsURL()}/${encodeURIComponent(promotionID)}`, {
        method: 'PATCH', headers: idempotencyHeaders(idempotencyKey), body: JSON.stringify(patch),
    });
}

export function changeAdminPromotionStatus(promotionID: string, action: AdminPromotionAction, idempotencyKey: string) {
    return apiFetch<AdminPromotion>(`${promotionsURL()}/${encodeURIComponent(promotionID)}/${action}`, {
        method: 'POST', headers: idempotencyHeaders(idempotencyKey),
    });
}

export function getAdminPromotionRedemptions(promotionID: string, limit = 50, offset = 0) {
    return apiFetch<AdminPromotionRedemption[]>(`${promotionsURL()}/${encodeURIComponent(promotionID)}/redemptions?${page(limit, offset)}`);
}

export function getAdminTrialGrants(managerID: string, limit = 20, offset = 0) {
    return apiFetch<AdminTrialGrant[]>(`${baseURL()}/trial-grants?manager_id=${encodeURIComponent(managerID)}&${page(limit, offset)}`);
}

export function revokeAdminTrialGrant(trialGrantID: string, reason: string, idempotencyKey: string) {
    return apiFetch<AdminTrialGrant>(`${baseURL()}/trial-grants/${encodeURIComponent(trialGrantID)}/revoke`, {
        method: 'POST', headers: idempotencyHeaders(idempotencyKey), body: JSON.stringify({ reason }),
    });
}

export function backfillAdminTrialGrant(managerID: string, idempotencyKey: string) {
    return apiFetch<AdminTrialBackfillResult>(`${baseURL()}/trial-grants/backfill`, {
        method: 'POST', headers: idempotencyHeaders(idempotencyKey), body: JSON.stringify({ manager_id: managerID }),
    });
}
