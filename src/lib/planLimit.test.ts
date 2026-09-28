import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiRequestError } from './apiUtils';
import {
    PLAN_UPGRADE_PATH,
    buildPlanLimitNotice,
    getEntitlementLimit,
    getPlanLimitResource,
    isPlanLimitError,
    resolvePlanLimitNotice,
} from './planLimit';
import type { ManagerSubscriptionEntitlement } from '@/services/managerSubscriptionService';

// Exact bodies sent by core (PUT /api/v1/properties/:id) and booking
// (POST /api/v1/fast-track) on origin/develop.
const CORE_LIMIT_MESSAGE = 'published property limit reached';
const BOOKING_LIMIT_MESSAGE = 'the manager has reached the active Fast Track limit for their subscription';

const conflict = (message: string, code?: string) =>
    new ApiRequestError(message, 'Invalid data provided. Please check your inputs.', 409, undefined, 'unhandled', code);

const entitlement = (properties: number | null, cases: number | null): ManagerSubscriptionEntitlement => ({
    state: 'free_active',
    source: 'free',
    reason: 'free_default',
    published_property_limit: properties === null ? { kind: 'unlimited' } : { kind: 'finite', value: properties },
    active_case_limit: cases === null ? { kind: 'unlimited' } : { kind: 'finite', value: cases },
    support_level: 'basic',
});

test('recognises the core published-property and booking Fast Track 409 refusals', () => {
    assert.equal(getPlanLimitResource(conflict(CORE_LIMIT_MESSAGE)), 'published_properties');
    assert.equal(getPlanLimitResource(conflict(BOOKING_LIMIT_MESSAGE)), 'active_fast_track_cases');
});

test('recognises the refusal after a service flattened it to a string or Error', () => {
    assert.equal(getPlanLimitResource(BOOKING_LIMIT_MESSAGE), 'active_fast_track_cases');
    assert.equal(getPlanLimitResource(new Error(CORE_LIMIT_MESSAGE)), 'published_properties');
});

test('accepts a machine code when a backend adds one', () => {
    assert.equal(getPlanLimitResource(conflict('Limit reached', 'quota_exceeded')), 'unspecified');
    assert.equal(getPlanLimitResource(conflict(CORE_LIMIT_MESSAGE, 'quota_exceeded')), 'published_properties');
    assert.equal(getPlanLimitResource(conflict('Limit reached', 'fast_track_limit_reached')), 'active_fast_track_cases');
});

test('does not treat other failures as a plan limit', () => {
    assert.equal(getPlanLimitResource(conflict('this user already has an active Fast Track for the property with another manager')), null);
    assert.equal(getPlanLimitResource(conflict('sale case admission is still pending')), null);
    // Booking hides 503 bodies and core maps entitlement outages to 503; neither is a limit.
    assert.equal(getPlanLimitResource(new ApiRequestError(CORE_LIMIT_MESSAGE, 'x', 503)), null);
    assert.equal(getPlanLimitResource(new ApiRequestError('entitlement unavailable', 'x', 503, undefined, 'unhandled', 'quota_exceeded')), null);
    assert.equal(getPlanLimitResource(new ApiRequestError(BOOKING_LIMIT_MESSAGE, 'x', 400)), null);
    assert.equal(getPlanLimitResource(null), null);
    assert.equal(getPlanLimitResource(''), null);
    assert.equal(isPlanLimitError('Unable to create the 24-hour fast-track case.'), false);
    assert.equal(isPlanLimitError(conflict(CORE_LIMIT_MESSAGE)), true);
});

test('builds the upgrade prompt with the plan limit and a subscription link', () => {
    const properties = buildPlanLimitNotice('published_properties', 8);
    assert.equal(properties.message, "You've reached your plan's limit of 8 published properties. Upgrade your plan to publish more properties.");
    assert.equal(properties.title, 'Plan limit reached');
    assert.deepEqual(properties.action, { label: 'Upgrade your plan', href: PLAN_UPGRADE_PATH });
    assert.equal(PLAN_UPGRADE_PATH, '/manager/subscription');

    const cases = buildPlanLimitNotice('active_fast_track_cases', 2);
    assert.equal(cases.message, "You've reached your plan's limit of 2 active Fast Track cases. Upgrade your plan to start more Fast Track cases.");
});

test('omits the number rather than inventing one when the limit is unknown', () => {
    assert.equal(
        buildPlanLimitNotice('published_properties').message,
        "You've reached your plan's limit of published properties. Upgrade your plan to publish more properties.",
    );
    assert.equal(
        buildPlanLimitNotice('active_fast_track_cases', 0).message,
        "You've reached your plan's limit of active Fast Track cases. Upgrade your plan to start more Fast Track cases.",
    );
    assert.equal(buildPlanLimitNotice('unspecified').message, "You've reached your plan's limit. Upgrade your plan to continue.");
});

test('reads only finite limits from the account entitlement', () => {
    assert.equal(getEntitlementLimit(entitlement(2, 10), 'published_properties'), 2);
    assert.equal(getEntitlementLimit(entitlement(2, 10), 'active_fast_track_cases'), 10);
    assert.equal(getEntitlementLimit(entitlement(null, null), 'published_properties'), undefined);
    assert.equal(getEntitlementLimit(null, 'active_fast_track_cases'), undefined);
    assert.equal(getEntitlementLimit(entitlement(2, 10), 'unspecified'), undefined);
});

test('resolves the prompt with the live limit and tolerates a failed entitlement read', async () => {
    const withLimit = await resolvePlanLimitNotice(conflict(CORE_LIMIT_MESSAGE), async () => entitlement(20, 50));
    assert.equal(withLimit?.message, "You've reached your plan's limit of 20 published properties. Upgrade your plan to publish more properties.");

    const fastTrack = await resolvePlanLimitNotice(BOOKING_LIMIT_MESSAGE, async () => entitlement(8, 10));
    assert.equal(fastTrack?.message, "You've reached your plan's limit of 10 active Fast Track cases. Upgrade your plan to start more Fast Track cases.");

    const readFailed = await resolvePlanLimitNotice(conflict(BOOKING_LIMIT_MESSAGE), async () => {
        throw new ApiRequestError('API error: 503', 'x', 503);
    });
    assert.equal(readFailed?.message, "You've reached your plan's limit of active Fast Track cases. Upgrade your plan to start more Fast Track cases.");
    assert.equal(readFailed?.action.href, '/manager/subscription');
});

test('does not read the entitlement for errors that are not plan limits', async () => {
    let reads = 0;
    const notice = await resolvePlanLimitNotice(conflict('property not found'), async () => {
        reads += 1;
        return entitlement(2, 2);
    });
    assert.equal(notice, null);
    assert.equal(reads, 0);
});

test('the plan-limit entitlement read uses a short timeout so spinners are not held', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(`${process.cwd()}/src/lib/planLimit.ts`, 'utf8');
    assert.ok(source.includes('getManagerSubscriptionSummary({ timeoutMs: PLAN_LIMIT_ENTITLEMENT_TIMEOUT_MS, suppressErrorToast: true })'));
    assert.match(source, /PLAN_LIMIT_ENTITLEMENT_TIMEOUT_MS = 4_000/);
});
