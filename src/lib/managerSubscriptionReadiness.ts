import { ApiRequestError } from './apiUtils';
import type { ManagerBillingProfile } from '@/services/managerBillingProfileService';
import type { ManagerSubscriptionEntitlement, ManagerSubscriptionResourceLimit, ManagerSubscriptionTrial } from '@/services/managerSubscriptionService';
import { getManagerPlanDisplayName } from './managerPlanNames';

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

export function getSubscriptionAccessPresentation(
    entitlement: ManagerSubscriptionEntitlement | null | undefined,
    trial?: ManagerSubscriptionTrial | null,
): SubscriptionAccessPresentation | null {
    if (!entitlement) return null;

    const trialPlanName = getManagerPlanDisplayName(trial?.plan_code || 'pro');
    const title = entitlement.source === 'free'
        ? 'Free access'
        : entitlement.source === 'trial'
            ? `${trialPlanName} plan trial`
            : entitlement.source === 'pilot'
                ? 'Pilot access'
                : 'Current paid access';
    const detail = entitlement.source === 'free'
        ? 'No payment is required. Upgrade only when you need higher limits.'
        : entitlement.source === 'trial'
            ? `Your ${trialPlanName} limits are free until the trial ends. No card is needed and nothing is charged automatically.`
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
            return 'Your billing country has not been verified for paid plans. An Estospaces admin verifies it after reviewing your business documents. Your free access and any existing subscription remain available.';
        }
        if (billingProfile.kind === 'loaded') {
            const { profile } = billingProfile;
            if (profile.verification_status === 'verified') {
                return `Your billing country is verified as ${marketName(profile.market)}, but paid plans cannot be loaded right now. Refresh or contact support about payment availability. Your free access and any existing subscription remain available.`;
            }
            return `Your billing country is recorded as ${marketName(profile.market)} but its billing verification is ${profile.verification_status}. An Estospaces admin verifies it after reviewing your business documents. Your free access and any existing subscription remain available.`;
        }
        return 'We could not check billing eligibility right now. Refresh or contact support if the issue continues. Your free access and any existing subscription remain available.';
    }
    return 'New plans are unavailable. Please refresh to retry. You can still manage an existing subscription below.';
}

/**
 * Billing country is verified only by an admin after document review. The
 * manager can ask for that review, never record the country themselves.
 */
export function needsBillingCountryReview(billingMarketBlocked: boolean, billingProfile: BillingProfileLookup): boolean {
    if (!billingMarketBlocked) return false;
    if (billingProfile.kind === 'missing') return true;
    return billingProfile.kind === 'loaded' && billingProfile.profile.verification_status !== 'verified';
}

export const MANAGER_HELP_PATH = '/manager/help';
export const MANAGER_VERIFICATION_PATH = '/manager/verification';

export interface BillingCountryDocument {
    name: string;
    status: string;
}

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
    not_uploaded: 'not uploaded',
    pending: 'uploaded, awaiting review',
    approved: 'approved',
    rejected: 'rejected',
    reupload_required: 'needs a new upload',
};

export const describeBillingDocumentStatus = (status: string): string => DOCUMENT_STATUS_LABELS[status] || status.replaceAll('_', ' ');

/**
 * Prefilled support ticket for a billing country review. Only the billing
 * status and document names go in the link; the ticket itself carries the
 * signed-in manager's identity.
 */
export function buildBillingCountryVerificationSupportPath(billingProfile: BillingProfileLookup, documents: BillingCountryDocument[]): string {
    const billingStatus = billingProfile.kind === 'loaded'
        ? `recorded as ${marketName(billingProfile.profile.market)} (${billingProfile.profile.verification_status.replaceAll('_', ' ')})`
        : 'not recorded';
    const documentLines = documents.length > 0
        ? documents.map((document) => `- ${document.name}: ${describeBillingDocumentStatus(document.status)}`).join('\n')
        : '- No manager verification documents are on file yet.';
    const message = [
        'Please review my business documents and verify my billing country for paid plans.',
        `Current billing country: ${billingStatus}.`,
        'Country my business is registered in: ',
        'Documents on my manager verification:',
        documentLines,
    ].join('\n');
    const params = new URLSearchParams({
        category: 'Verification',
        subject: 'Billing country verification request',
        message,
    });
    return `${MANAGER_HELP_PATH}?${params.toString()}`;
}
