import { ApiRequestError } from './apiUtils';
import type { ManagerSubscriptionEntitlement, ManagerSubscriptionResourceLimit } from '@/services/managerSubscriptionService';

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

export function getSubscriptionOffersErrorMessage(error: unknown): string {
    if (error instanceof ApiRequestError && error.status === 409 && error.code === 'billing_market_unavailable') {
        return 'We could not confirm a supported, verified billing country. Contact support to check your billing country and payment availability, then refresh. You can still manage an existing subscription below.';
    }
    return 'New plans are unavailable. Please refresh to retry. You can still manage an existing subscription below.';
}
