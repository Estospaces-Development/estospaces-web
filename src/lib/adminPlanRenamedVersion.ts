import type { AdminSubscriptionPlan, AdminSubscriptionPlanDraft } from '@/services/adminSubscriptionService';
import { LEGACY_PLAN_NAME_RENAMES, legacyPlanNamePattern } from './managerPlanNames';

// A renamed version is a new immutable Draft that copies an approved version's
// commercial terms exactly. Only the version, terms version and the legacy plan
// names inside the terms text change.

export const TERMS_ALREADY_CURRENT_NOTE = 'Terms already use the current plan name';

export interface TermsPart {
    text: string;
    // Set when `text` is a legacy phrase that the new terms replace.
    replacement?: string;
}

export interface RenamedTerms {
    text: string;
    parts: TermsPart[];
    replacements: number;
}

// One left-to-right pass over the stored text, so a replacement is never
// scanned again (a `pro` plan's new "Growth" is never turned into "Premium").
export function renameLegacyPlanTerms(code: 'pro' | 'growth', termsText: string): RenamedTerms {
    const current = new Map(LEGACY_PLAN_NAME_RENAMES[code]);
    const parts: TermsPart[] = [];
    let cursor = 0;
    for (const match of termsText.matchAll(legacyPlanNamePattern(code, 'g'))) {
        if (match.index > cursor) parts.push({ text: termsText.slice(cursor, match.index) });
        parts.push({ text: match[0], replacement: current.get(match[0]) });
        cursor = match.index + match[0].length;
    }
    if (cursor < termsText.length) parts.push({ text: termsText.slice(cursor) });
    return {
        text: parts.map((part) => part.replacement ?? part.text).join(''),
        parts,
        replacements: parts.filter((part) => part.replacement !== undefined).length,
    };
}

// Versions are unique per code across currencies (payment index
// ux_subscription_plan_version is mode + code + version).
export function nextPlanVersion(plans: ReadonlyArray<Pick<AdminSubscriptionPlan, 'code' | 'version'>>, code: 'pro' | 'growth'): number {
    return Math.max(0, ...plans.filter((plan) => plan.code === code).map((plan) => plan.version)) + 1;
}

// Existing convention: `2026-09-india-pro-v1`, i.e. <year-month>-<market>-<code>-v<version>.
export function renamedTermsVersion(plan: Pick<AdminSubscriptionPlan, 'code' | 'currency'>, version: number, now: Date): string {
    const market = plan.currency === 'INR' ? 'india' : 'uk';
    return `${now.toISOString().slice(0, 7)}-${market}-${plan.code}-v${version}`;
}

export type RenamedVersionAction =
    | { state: 'hidden' }
    | { state: 'disabled'; reason: string }
    | { state: 'enabled'; terms: RenamedTerms };

export function getRenamedVersionAction(plan: AdminSubscriptionPlan, catalog: ReadonlyArray<AdminSubscriptionPlan>): RenamedVersionAction {
    if (!plan.approved_at || plan.retired_at) return { state: 'hidden' };
    if (plan.terms_schema_version !== 2) return { state: 'disabled', reason: 'Only terms schema v2 versions can be copied' };
    if (!plan.provider_plan_id) return { state: 'disabled', reason: 'The provider plan ID was not returned' };
    const terms = renameLegacyPlanTerms(plan.code, plan.terms_text);
    if (terms.replacements === 0) return { state: 'disabled', reason: TERMS_ALREADY_CURRENT_NOTE };
    // Payment limits terms_text to 16,384 bytes (Go len counts UTF-8 bytes).
    if (new TextEncoder().encode(terms.text).length > 16384) return { state: 'disabled', reason: 'The renamed terms would exceed 16 KB' };
    // A renamed draft or approved successor that is still live makes another copy redundant.
    const existing = catalog.find((other) => other.id !== plan.id && !other.retired_at && other.code === plan.code &&
        other.currency === plan.currency && other.terms_text === terms.text);
    if (existing) return { state: 'disabled', reason: `Renamed version v${existing.version} already exists (${existing.approved_at ? 'approved' : 'draft'})` };
    return { state: 'enabled', terms };
}

// Commercial fields copied unchanged from the approved version.
export const COPIED_PLAN_FIELDS = [
    'code', 'currency', 'amount_minor', 'tax_minor', 'tax_inclusive',
    'billing_period', 'billing_interval', 'total_cycles',
    'published_property_limit', 'active_case_limit', 'image_upload_limit_bytes',
    'support_level', 'featured', 'lead_delivery_policy', 'terms_schema_version', 'provider_plan_id',
] as const satisfies ReadonlyArray<keyof AdminSubscriptionPlan & keyof AdminSubscriptionPlanDraft>;

export function buildRenamedPlanDraft(source: AdminSubscriptionPlan, catalog: ReadonlyArray<AdminSubscriptionPlan>, now: Date): AdminSubscriptionPlanDraft {
    const action = getRenamedVersionAction(source, catalog);
    if (action.state !== 'enabled' || !source.provider_plan_id) {
        throw new Error(action.state === 'disabled' ? action.reason : 'Only approved, unretired versions can be renamed');
    }
    const version = nextPlanVersion(catalog, source.code);
    return {
        code: source.code,
        version,
        provider_plan_id: source.provider_plan_id,
        amount_minor: source.amount_minor,
        tax_minor: source.tax_minor,
        currency: source.currency,
        billing_period: source.billing_period,
        billing_interval: source.billing_interval,
        total_cycles: source.total_cycles,
        published_property_limit: source.published_property_limit,
        // Terms schema v2 (required above) stores these as zero or false; the
        // admin read omits them for v2, so they are not in `source`.
        property_upload_bytes: 0,
        supplied_leads: 0,
        leads_per_property: false,
        fast_track_discount_bps: 0,
        support_level: source.support_level,
        featured: source.featured,
        terms_schema_version: source.terms_schema_version,
        image_upload_limit_bytes: source.image_upload_limit_bytes,
        active_case_limit: source.active_case_limit,
        lead_delivery_policy: source.lead_delivery_policy,
        tax_inclusive: source.tax_inclusive,
        terms_version: renamedTermsVersion(source, version, now),
        terms_text: action.terms.text,
    };
}

// The other tier's legacy name is left unchanged (for example "Estospaces
// Growth" in `pro` text may name the higher tier). Return it so the admin is warned.
export function otherTierLegacyName(code: 'pro' | 'growth', termsText: string): string | null {
    return legacyPlanNamePattern(code === 'pro' ? 'growth' : 'pro').exec(termsText)?.[0] ?? null;
}

export function copiedFieldsMatch(source: AdminSubscriptionPlan, draft: AdminSubscriptionPlanDraft): boolean {
    return COPIED_PLAN_FIELDS.every((field) => source[field] === draft[field]);
}
