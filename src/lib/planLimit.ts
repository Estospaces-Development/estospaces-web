import { ApiRequestError } from '@/lib/apiUtils';
import {
    getManagerSubscriptionSummary,
    type ManagerSubscriptionEntitlement,
} from '@/services/managerSubscriptionService';

export const PLAN_UPGRADE_PATH = '/manager/subscription';
export const PLAN_UPGRADE_LABEL = 'Upgrade your plan';
export const PLAN_LIMIT_TITLE = 'Plan limit reached';

export type PlanLimitResource = 'published_properties' | 'active_fast_track_cases' | 'unspecified';

export interface PlanLimitNotice {
    resource: PlanLimitResource;
    title: string;
    message: string;
    action: { label: string; href: string };
}

// Core and Booking answer a plan limit with HTTP 409 and a fixed sentence
// (core internal/properties/entitlement.go ErrPropertyLimitReached, booking
// internal/bookings/fasttrack.go errFastTrackLimitReached). Neither sends a
// machine code today, so the sentences are matched; the codes are accepted so a
// later backend code does not need a coordinated web change.
const PLAN_LIMIT_CODES: Record<string, PlanLimitResource> = {
    quota_exceeded: 'unspecified',
    plan_limit_reached: 'unspecified',
    limit_reached: 'unspecified',
    published_property_limit_reached: 'published_properties',
    fast_track_limit_reached: 'active_fast_track_cases',
    active_case_limit_reached: 'active_fast_track_cases',
};

const PUBLISHED_PROPERTY_LIMIT_PATTERN = /published property limit reached/i;
const FAST_TRACK_LIMIT_PATTERN = /reached the active fast[\s-]?track limit/i;

function resourceFromMessage(message: string): PlanLimitResource | null {
    if (PUBLISHED_PROPERTY_LIMIT_PATTERN.test(message)) {
        return 'published_properties';
    }
    if (FAST_TRACK_LIMIT_PATTERN.test(message)) {
        return 'active_fast_track_cases';
    }
    return null;
}

/**
 * Recognises a plan-limit refusal from an ApiRequestError, an Error, or the
 * error string a service returned. A known non-409 status is never a plan limit.
 */
export function getPlanLimitResource(error: unknown): PlanLimitResource | null {
    if (error instanceof ApiRequestError) {
        if (error.status !== undefined && error.status !== 409) {
            return null;
        }
        const fromMessage = resourceFromMessage(error.message || '');
        const code = (error.code || '').trim().toLowerCase();
        if (code && code in PLAN_LIMIT_CODES) {
            const fromCode = PLAN_LIMIT_CODES[code];
            return fromCode === 'unspecified' ? fromMessage ?? 'unspecified' : fromCode;
        }
        return fromMessage;
    }
    if (error instanceof Error) {
        return resourceFromMessage(error.message || '');
    }
    if (typeof error === 'string') {
        return resourceFromMessage(error);
    }
    return null;
}

export function isPlanLimitError(error: unknown): boolean {
    return getPlanLimitResource(error) !== null;
}

function describeResource(resource: PlanLimitResource, limit: number | undefined) {
    const plural = limit !== 1;
    switch (resource) {
        case 'published_properties':
            return { noun: plural ? 'published properties' : 'published property', verb: 'publish more properties' };
        case 'active_fast_track_cases':
            return { noun: plural ? 'active Fast Track cases' : 'active Fast Track case', verb: 'start more Fast Track cases' };
        default:
            return { noun: '', verb: 'continue' };
    }
}

/** Builds the upgrade prompt. The limit is omitted when it is not known. */
export function buildPlanLimitNotice(resource: PlanLimitResource, limit?: number | null): PlanLimitNotice {
    const knownLimit = typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? limit : undefined;
    const { noun, verb } = describeResource(resource, knownLimit);
    const reached = noun
        ? `You've reached your plan's limit of ${knownLimit !== undefined ? `${knownLimit} ` : ''}${noun}.`
        : "You've reached your plan's limit.";
    return {
        resource,
        title: PLAN_LIMIT_TITLE,
        message: `${reached} ${PLAN_UPGRADE_LABEL} to ${verb}.`,
        action: { label: PLAN_UPGRADE_LABEL, href: PLAN_UPGRADE_PATH },
    };
}

/** Reads the finite limit for the resource from the account entitlement. */
export function getEntitlementLimit(
    entitlement: ManagerSubscriptionEntitlement | null | undefined,
    resource: PlanLimitResource,
): number | undefined {
    const limit = resource === 'published_properties'
        ? entitlement?.published_property_limit
        : resource === 'active_fast_track_cases'
            ? entitlement?.active_case_limit
            : undefined;
    if (!limit || limit.kind !== 'finite' || typeof limit.value !== 'number') {
        return undefined;
    }
    return limit.value;
}

export type EntitlementLoader = () => Promise<ManagerSubscriptionEntitlement | null | undefined>;

/** Reads the signed-in manager's current entitlement from Payment. */
export const loadManagerPlanEntitlement: EntitlementLoader = async () => {
    const summary = await getManagerSubscriptionSummary();
    return summary?.account?.entitlement;
};

/**
 * Returns the upgrade prompt for a plan-limit error, or null for any other
 * error. The current limit is read best effort; a failed read only drops N.
 */
export async function resolvePlanLimitNotice(
    error: unknown,
    loadEntitlement?: EntitlementLoader,
): Promise<PlanLimitNotice | null> {
    const resource = getPlanLimitResource(error);
    if (!resource) {
        return null;
    }
    let limit: number | undefined;
    if (loadEntitlement && resource !== 'unspecified') {
        try {
            limit = getEntitlementLimit(await loadEntitlement(), resource);
        } catch {
            limit = undefined;
        }
    }
    return buildPlanLimitNotice(resource, limit);
}
