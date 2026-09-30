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

// Older approved plan versions store consent text that uses the previous names:
// "Estospaces Pro" or "Pro manager subscription" for `pro`, and "Estospaces
// Growth" or "Growth manager subscription" for `growth`. That text is the
// accepted consent and is never rewritten; this explains which customer-facing
// plan it belongs to. The phrases are per code, so new `pro` text that says
// "Estospaces Growth" is never mistaken for the legacy `growth` name.
export const LEGACY_PLAN_NAME_RENAMES: Record<'pro' | 'growth', ReadonlyArray<readonly [legacy: string, current: string]>> = {
    pro: [
        ['Pro manager subscription', 'Growth manager subscription'],
        ['Estospaces Pro', 'Estospaces Growth'],
    ],
    growth: [
        ['Growth manager subscription', 'Premium manager subscription'],
        ['Estospaces Growth', 'Estospaces Premium'],
    ],
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole phrases only, case-sensitive exactly as stored.
export function legacyPlanNamePattern(code: 'pro' | 'growth', flags = ''): RegExp {
    return new RegExp(`\\b(?:${LEGACY_PLAN_NAME_RENAMES[code].map(([legacy]) => escapeRegExp(legacy)).join('|')})\\b`, flags);
}

export function describeStoredTermsPlanName(code: string | null | undefined, termsText: string | null | undefined): string | null {
    const key = String(code || '').trim().toLowerCase();
    if (key !== 'pro' && key !== 'growth') return null;
    const match = legacyPlanNamePattern(key).exec(termsText || '');
    return match ? `${getManagerPlanDisplayName(key)} plan (internal plan name in these terms: ${match[0]})` : null;
}
