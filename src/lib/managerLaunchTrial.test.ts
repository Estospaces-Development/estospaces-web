import assert from 'node:assert/strict';
import test from 'node:test';

import {
    DAY_MS,
    TRIAL_NO_CHARGE_NOTE,
    getLaunchOfferMessage,
    getTrialBanner,
    managerSubscriptionSummaryQueryKey,
    parseLaunchOffer,
    trialDaysRemaining,
} from './managerLaunchTrial';
import type { ManagerSubscriptionEntitlement, ManagerSubscriptionTrial } from '../services/managerSubscriptionService';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const endsAt = '2026-11-27T10:00:00.000Z';
const end = new Date(endsAt);
const before = (ms: number) => new Date(end.getTime() - ms);

const trial = (overrides: Partial<ManagerSubscriptionTrial> = {}): ManagerSubscriptionTrial => ({
    plan_code: 'pro', plan_name: 'Pro', starts_at: '2026-09-28T10:00:00.000Z', ends_at: endsAt, days_remaining: 60, state: 'active', ...overrides,
});

const trialEntitlement: ManagerSubscriptionEntitlement = {
    state: 'trial_active', source: 'trial', ends_at: endsAt, reason: 'trial',
    published_property_limit: { kind: 'finite', value: 8 }, active_case_limit: { kind: 'finite', value: 10 }, support_level: 'standard',
};
const freeEntitlement: ManagerSubscriptionEntitlement = {
    state: 'free_active', source: 'free', reason: 'trial_expired',
    published_property_limit: { kind: 'finite', value: 2 }, active_case_limit: { kind: 'finite', value: 2 }, support_level: 'basic',
};

test('signup launch offer copy for active, pending and none', () => {
    assert.equal(getLaunchOfferMessage({ status: 'active', plan_name: 'Growth', ends_at: endsAt }, formatDate), 'Growth plan active until 2026-11-27. No card needed.');
    assert.equal(getLaunchOfferMessage({ status: 'pending' }, formatDate), 'Your 60-day Growth plan will be ready when you sign in.');
    assert.equal(getLaunchOfferMessage({ status: 'none' }, formatDate), null);
    assert.equal(getLaunchOfferMessage(null, formatDate), null);
    assert.equal(getLaunchOfferMessage({ status: 'active', ends_at: 'not-a-date' }, formatDate), 'Growth plan active. No card needed.');
});

test('launch offer is read from raw or wrapped signup responses and junk is ignored', () => {
    assert.deepEqual(parseLaunchOffer({ token: 't', launch_offer: { status: 'active', plan_name: 'Growth', ends_at: endsAt } }), { status: 'active', plan_name: 'Growth', ends_at: endsAt });
    assert.deepEqual(parseLaunchOffer({ data: { launch_offer: { status: 'pending' } } }), { status: 'pending', plan_name: undefined, ends_at: undefined });
    assert.equal(parseLaunchOffer({ launch_offer: { status: 'granted' } }), null);
    assert.equal(parseLaunchOffer({}), null);
    assert.equal(parseLaunchOffer(null), null);
});

test('days remaining rounds partial days up and stops at zero', () => {
    assert.equal(trialDaysRemaining(end, before(60 * DAY_MS)), 60);
    assert.equal(trialDaysRemaining(end, before(DAY_MS + 1)), 2);
    assert.equal(trialDaysRemaining(end, before(DAY_MS)), 1);
    assert.equal(trialDaysRemaining(end, before(1)), 1);
    assert.equal(trialDaysRemaining(end, end), 0);
    assert.equal(trialDaysRemaining(end, new Date(end.getTime() + DAY_MS)), 0);
});

test('active trial banner takes its limits from the entitlement', () => {
    const banner = getTrialBanner(trial(), trialEntitlement, before(30 * DAY_MS), formatDate);
    assert.equal(banner?.kind, 'active');
    assert.equal(banner?.title, 'Growth plan active until 2026-11-27 · 8 published properties · 10 active Fast Track cases');
    assert.equal(banner?.action, undefined);
    const other = getTrialBanner(trial(), { ...trialEntitlement, published_property_limit: { kind: 'finite', value: 5 }, active_case_limit: { kind: 'unlimited' } }, before(30 * DAY_MS), formatDate);
    assert.equal(other?.title, 'Growth plan active until 2026-11-27 · 5 published properties · unlimited active Fast Track cases');
});

test('ending soon warns from 7 days and switches to the last-day copy within a day', () => {
    assert.equal(getTrialBanner(trial(), trialEntitlement, before(7 * DAY_MS + 1), formatDate)?.kind, 'active');
    const soon = getTrialBanner(trial(), trialEntitlement, before(7 * DAY_MS), formatDate);
    assert.equal(soon?.kind, 'ending_soon');
    assert.equal(soon?.title, 'Your Growth plan ends in 7 days, on 2026-11-27.');
    assert.equal(soon?.detail, `Subscribe to keep 8 published properties and 10 active Fast Track cases. ${TRIAL_NO_CHARGE_NOTE}`);
    assert.equal(soon?.action?.label, 'Subscribe');
    assert.equal(getTrialBanner(trial(), trialEntitlement, before(DAY_MS + 1), formatDate)?.kind, 'ending_soon');
    const last = getTrialBanner(trial(), trialEntitlement, before(DAY_MS), formatDate);
    assert.equal(last?.kind, 'last_day');
    assert.equal(last?.title, 'Your Growth plan ends within a day, on 2026-11-27.');
    assert.match(last?.detail || '', /won't charge you automatically/);
});

test('ended trial shows the Free limits and keeps existing work', () => {
    const ended = getTrialBanner(trial({ state: 'expired', days_remaining: 0 }), freeEntitlement, new Date(end.getTime() + DAY_MS), formatDate);
    assert.equal(ended?.kind, 'ended');
    assert.equal(ended?.title, 'Your Growth trial ended on 2026-11-27.');
    assert.equal(ended?.detail, "You're on Free: 2 published properties and 2 active Fast Track cases. Existing listings and cases stay as they are.");
    // Computed on read: an "active" trial past its end is treated as ended.
    assert.equal(getTrialBanner(trial(), freeEntitlement, end, formatDate)?.kind, 'ended');
    // Unknown Free limits are omitted rather than guessed.
    assert.equal(getTrialBanner(trial({ state: 'expired' }), null, end, formatDate)?.detail, "You're on Free. Existing listings and cases stay as they are.");
});

test('no trial banner for paid, superseded, revoked or missing trials', () => {
    const paid: ManagerSubscriptionEntitlement = { ...trialEntitlement, state: 'paid_active', source: 'paid' };
    assert.equal(getTrialBanner(trial(), paid, before(3 * DAY_MS), formatDate), null);
    assert.equal(getTrialBanner(trial({ state: 'superseded' }), paid, before(3 * DAY_MS), formatDate), null);
    assert.equal(getTrialBanner(trial({ state: 'revoked' }), freeEntitlement, before(3 * DAY_MS), formatDate), null);
    assert.equal(getTrialBanner(null, freeEntitlement, before(3 * DAY_MS), formatDate), null);
    assert.equal(getTrialBanner(trial({ ends_at: 'bad' }), trialEntitlement, before(3 * DAY_MS), formatDate), null);
});

test('summary query key is scoped to the signed-in account', () => {
    assert.deepEqual(managerSubscriptionSummaryQueryKey('manager-1'), ['manager-subscription-summary', 'manager-1']);
    assert.notDeepEqual(managerSubscriptionSummaryQueryKey('manager-1'), managerSubscriptionSummaryQueryKey('manager-2'));
});
