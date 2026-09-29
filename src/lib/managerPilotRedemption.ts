import { ApiRequestError } from './apiUtils';
import type { ManagerPilotStatus, ManagerSubscriptionSummary } from '@/services/managerSubscriptionService';

// payment-service issues codes as ESTO-PILOT- followed by 32 upper-case hex
// characters and compares them exactly (validPilotCode in pilot.go).
const PILOT_CODE_PREFIX = 'ESTO-PILOT-';
const PILOT_CODE_PATTERN = /^ESTO-PILOT-[0-9A-F]{32}$/;
export const PILOT_CODE_LENGTH = PILOT_CODE_PREFIX.length + 32;

// Codes are often pasted from email or chat with spaces, line breaks or in lower
// case. Removing whitespace and upper-casing cannot turn one issued code into another.
export function normalizePilotCode(raw: string): string {
    return raw.replace(/\s+/g, '').toUpperCase();
}

export function isWellFormedPilotCode(code: string): boolean {
    return PILOT_CODE_PATTERN.test(code);
}

export function getPilotCodeInputError(raw: string): string | null {
    const code = normalizePilotCode(raw);
    if (!code) return 'Enter the pilot code you received from Estospaces.';
    if (!isWellFormedPilotCode(code)) {
        return `Pilot codes start with ${PILOT_CODE_PREFIX} followed by 32 letters (A-F) and numbers. Check the code and try again.`;
    }
    return null;
}

export type PilotRedemptionAvailability =
    | { kind: 'active'; campaign?: string; startsAt?: string; endsAt?: string }
    | { kind: 'available' }
    | { kind: 'blocked'; reason: string }
    | { kind: 'unknown'; reason: string };

function isFuture(value: string | undefined, now: number): boolean {
    if (!value) return false;
    const time = Date.parse(value);
    return Number.isFinite(time) && time > now;
}

// Mirrors the server's refusal rules only to avoid offering an action that will
// fail; PilotService.Redeem remains the authority and its error is always shown.
export function getPilotRedemptionAvailability(input: {
    pilotStatus: ManagerPilotStatus | null;
    pilotStatusFailed: boolean;
    summary: ManagerSubscriptionSummary | null;
    now: number;
}): PilotRedemptionAvailability {
    const { pilotStatus, pilotStatusFailed, summary, now } = input;
    const grant = pilotStatus?.grant;
    if (grant && isFuture(grant.ends_at, now)) {
        return { kind: 'active', campaign: grant.campaign, startsAt: grant.starts_at, endsAt: grant.ends_at };
    }
    const entitlement = summary?.entitlement;
    if (entitlement?.state === 'pilot_active') {
        return { kind: 'active', endsAt: entitlement.ends_at };
    }
    if (pilotStatusFailed || !summary) {
        return { kind: 'unknown', reason: 'Pilot status could not be loaded. Refresh to try again before entering a code.' };
    }
    if (summary.checkout || entitlement?.state === 'paid_active') {
        return {
            kind: 'blocked',
            reason: 'A pilot cannot start while this account has a paid subscription or an unresolved subscription checkout. Manage the subscription above, or contact support if you were offered a pilot.',
        };
    }
    return { kind: 'available' };
}

const RETRY_SAFE = 'Using the same code again will not create a second pilot.';
const GENERIC_REDEEM_ERROR = `The pilot could not be started. Refresh to check whether it is active. ${RETRY_SAFE}`;

// Keyed by payment-service subscriptionHTTPError codes (http_helpers.go).
const REDEEM_ERROR_MESSAGES: Record<string, string> = {
    pilot_coupon_unavailable: 'This pilot code cannot be used. It may be mistyped, expired, revoked, already used, or issued to a different account. Check the code or contact support.',
    pilot_access_conflict: 'A pilot cannot start while this account already has an active pilot, a paid subscription or an unresolved subscription checkout. Refresh this page to see your current access.',
    billing_market_unavailable: 'A verified billing country is required before a pilot can start. Ask support to review your business documents, then try again.',
    invalid_pilot_request: 'Enter the full pilot code exactly as it was sent to you.',
    invalid_request: 'Enter the full pilot code exactly as it was sent to you.',
    access_denied: 'Only manager accounts can redeem a pilot code.',
    provider_unavailable: `The subscription service is temporarily unavailable. Try again in a few minutes. ${RETRY_SAFE}`,
};

export function getPilotRedeemErrorMessage(error: unknown): string {
    if (!(error instanceof ApiRequestError)) return GENERIC_REDEEM_ERROR;
    const known = error.code ? REDEEM_ERROR_MESSAGES[error.code] : undefined;
    if (known) return known;
    if (error.status === 401) return 'Your session has expired. Sign in again to redeem your pilot code.';
    if (error.status === 429) return 'Too many attempts. Wait a minute and try again.';
    return GENERIC_REDEEM_ERROR;
}

export function formatPilotDate(value: string | undefined, timeZone?: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', ...(timeZone ? { timeZone } : {}) });
}
