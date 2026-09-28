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
