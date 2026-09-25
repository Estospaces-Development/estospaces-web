import { ApiRequestError } from './apiUtils';
import type { ManagerBillingProfile } from '@/services/managerBillingProfileService';
import type { ManagerSubscriptionEntitlement, ManagerSubscriptionResourceLimit } from '@/services/managerSubscriptionService';

export type BillingProfileLookup =
    | { kind: 'loaded'; profile: ManagerBillingProfile }
    | { kind: 'missing' }
    | { kind: 'unavailable' };

const marketName = (market: ManagerBillingProfile['market']) => market === 'IN' ? 'India' : 'United Kingdom';

export function isBillingMarketUnavailable(error: unknown): boolean {
    return error instanceof ApiRequestError && error.status === 409 && error.code === 'billing_market_unavailable';
}

export function classifyBillingProfileLookup(result: PromiseSettledResult<ManagerBillingProfile>): BillingProfileLookup {
    if (result.status === 'fulfilled') return { kind: 'loaded', profile: result.value };
    if (result.reason instanceof ApiRequestError && result.reason.status === 404) return { kind: 'missing' };
    return { kind: 'unavailable' };
}

export interface SubscriptionAccessPresentation {
    title: string;
    detail: string;
    publishedProperties: string;
    activeFastTrackCases: string;
    support: string;
}

function formatLimit(limit: ManagerSubscriptionResourceLimit | undefined): string {
    if (limit?.kind === 'unlimited') return 'Unlimited';
    if (limit?.kind === 'finite' && Number.isInteger(limit.value) && (limit.value ?? 0) >= 0) return String(limit.value);
    return 'Unavailable';
}

export function getSubscriptionAccessPresentation(entitlement: ManagerSubscriptionEntitlement | null | undefined): SubscriptionAccessPresentation | null {
    if (!entitlement) return null;

    const title = entitlement.source === 'free'
        ? 'Free access'
        : entitlement.source === 'pilot'
            ? 'Pilot access'
            : 'Current paid access';
    const detail = entitlement.source === 'free'
        ? 'No payment is required. Upgrade only when you need higher limits.'
        : entitlement.source === 'pilot'
            ? 'Your pilot benefits are active until their recorded end date.'
            : 'Your account limits are active for the current paid period.';

    return {
        title,
        detail,
        publishedProperties: formatLimit(entitlement.published_property_limit),
        activeFastTrackCases: formatLimit(entitlement.active_case_limit),
        support: entitlement.support_level,
    };
}

export function getSubscriptionOffersErrorMessage(error: unknown, billingProfile: BillingProfileLookup): string {
    if (isBillingMarketUnavailable(error)) {
        if (billingProfile.kind === 'missing') {
            return 'Your billing country has not been verified for paid plans. Ask support to review your business documents and confirm your billing country. Your free access and any existing subscription remain available.';
        }
        if (billingProfile.kind === 'loaded') {
            const { profile } = billingProfile;
            if (profile.verification_status === 'verified') {
                return `Your billing country is verified as ${marketName(profile.market)}, but paid plans cannot be loaded right now. Refresh or contact support about payment availability. Your free access and any existing subscription remain available.`;
            }
            return `Your billing country is recorded as ${marketName(profile.market)} but its billing verification is ${profile.verification_status}. Ask support to review your business documents. Your free access and any existing subscription remain available.`;
        }
        return 'We could not check billing eligibility right now. Refresh or contact support if the issue continues. Your free access and any existing subscription remain available.';
    }
    return 'New plans are unavailable. Please refresh to retry. You can still manage an existing subscription below.';
}
