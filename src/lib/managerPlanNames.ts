// Customer-facing plan names. Internal plan codes stay unchanged: `pro` is the
// ₹999 / £49 tier sold as "Growth", and `growth` is the ₹2,499 tier sold as
// "Premium". Razorpay's own screens may still show the older names.
export type ManagerPlanCode = 'free' | 'pro' | 'growth';

const PLAN_DISPLAY_NAMES: Record<ManagerPlanCode, string> = {
    free: 'Free',
    pro: 'Growth',
    growth: 'Premium',
};

export const FALLBACK_PAID_PLAN_NAME = 'Paid plan';

export function getManagerPlanDisplayName(code: string | null | undefined): string {
    const key = String(code || '').trim().toLowerCase();
    return key in PLAN_DISPLAY_NAMES ? PLAN_DISPLAY_NAMES[key as ManagerPlanCode] : FALLBACK_PAID_PLAN_NAME;
}

// Older approved plan versions store consent text that uses the previous names
// ("Estospaces Pro", "Estospaces Growth"). That text is the accepted consent and
// is never rewritten; this explains which customer-facing plan it belongs to.
const LEGACY_TERMS_NAMES: Record<'pro' | 'growth', RegExp> = {
    pro: /\bEstospaces Pro\b/,
    growth: /\bEstospaces Growth\b/,
};

export function describeStoredTermsPlanName(code: string | null | undefined, termsText: string | null | undefined): string | null {
    const key = String(code || '').trim().toLowerCase();
    if (key !== 'pro' && key !== 'growth') return null;
    const match = LEGACY_TERMS_NAMES[key].exec(termsText || '');
    return match ? `${getManagerPlanDisplayName(key)} plan (internal plan name in these terms: ${match[0]})` : null;
}
