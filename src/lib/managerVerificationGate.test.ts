import assert from 'node:assert/strict';
import test from 'node:test';

import type { VerificationStatus } from '@/services/managerVerificationService';
import {
    VERIFIED_MANAGER_AREA_DETAIL,
    VERIFIED_MANAGER_AREA_VIEW_ACTION,
    getManagerVerificationNotice,
    resolveManagerVerificationGate,
} from './managerVerificationGate';

const input = (verificationStatus: VerificationStatus | null, overrides: Partial<Parameters<typeof resolveManagerVerificationGate>[0]> = {}) => ({
    isLoading: false,
    error: null,
    hasProfile: true,
    verificationStatus,
    ...overrides,
});

test('a verified manager passes the gate', () => {
    assert.deepEqual(resolveManagerVerificationGate(input('approved')), { kind: 'allow' });
});

test('the gate waits for the verification summary instead of deciding early', () => {
    assert.deepEqual(resolveManagerVerificationGate(input(null, { isLoading: true })), { kind: 'loading' });
    assert.deepEqual(resolveManagerVerificationGate(input('approved', { isLoading: true })), { kind: 'loading' });
});

test('a pending manager gets an explicit pending-verification explanation (QA-MB-20260922-01-001)', () => {
    for (const status of ['submitted', 'under_review'] as const) {
        const decision = resolveManagerVerificationGate(input(status));
        assert.equal(decision.kind, 'gate');
        if (decision.kind !== 'gate') return;
        assert.equal(decision.notice.heading, 'Your manager profile is pending verification');
        assert.equal(decision.notice.status, status);
        assert.equal(decision.notice.retryable, false);
    }
    const submitted = getManagerVerificationNotice(input('submitted'));
    assert.equal(submitted?.statusLabel, 'Pending review');
});

test('re-verification names the profile-change cause and prefers the reason core recorded (QA-MB-20260923-01-029)', () => {
    const generic = getManagerVerificationNotice(input('verification_required'));
    assert.equal(generic?.heading, 'Re-verification required after profile changes');
    assert.equal(generic?.statusLabel, 'Re-verification required');
    assert.match(generic?.reason ?? '', /Your verified manager details changed/);

    const recorded = getManagerVerificationNotice(input('verification_required', {
        reverificationReason: 'Agency profile details changed and require admin review.',
    }));
    assert.match(recorded?.reason ?? '', /^Agency profile details changed and require admin review\. Resubmit/);
});

test('rejected, incomplete and missing profiles are gated with their own next step', () => {
    assert.equal(getManagerVerificationNotice(input('rejected'))?.heading, 'Your manager verification needs changes');
    assert.equal(getManagerVerificationNotice(input('incomplete'))?.heading, 'Complete your manager verification');
    const missing = getManagerVerificationNotice(input(null, { hasProfile: false }));
    assert.equal(missing?.status, 'incomplete');
    // A stale status without a profile must not be treated as verified.
    assert.equal(getManagerVerificationNotice(input('approved', { hasProfile: false }))?.status, 'incomplete');
});

test('a failed status lookup fails closed with a retry, not a verified pass', () => {
    const decision = resolveManagerVerificationGate(input(null, { error: 'Network error', hasProfile: false }));
    assert.equal(decision.kind, 'gate');
    if (decision.kind !== 'gate') return;
    assert.equal(decision.notice.retryable, true);
    assert.equal(decision.notice.status, 'unknown');
});

test('existing work stays viewable only where the backend serves it; analytics stays gated', () => {
    assert.ok(VERIFIED_MANAGER_AREA_VIEW_ACTION['fast-track']);
    assert.ok(VERIFIED_MANAGER_AREA_VIEW_ACTION.appointments);
    assert.ok(VERIFIED_MANAGER_AREA_VIEW_ACTION.contracts);
    assert.equal(VERIFIED_MANAGER_AREA_VIEW_ACTION.analytics, undefined);
    assert.equal(VERIFIED_MANAGER_AREA_VIEW_ACTION.subscription, undefined);
    // Core refuses new Fast Track case links for ineligible managers; the copy must say so.
    assert.match(VERIFIED_MANAGER_AREA_DETAIL['fast-track'], /Starting new cases is paused/);
});

test('re-verification and rejected states open existing cases, appointments and contracts under a notice', () => {
    for (const area of ['fast-track', 'appointments', 'contracts'] as const) {
        for (const status of ['verification_required', 'submitted', 'under_review', 'rejected'] as const) {
            const decision = resolveManagerVerificationGate(input(status, { area }));
            assert.equal(decision.kind, 'open-with-notice', `${area} / ${status}`);
        }
    }
});

test('a first-time incomplete manager, analytics and a failed lookup keep the full gate', () => {
    assert.equal(resolveManagerVerificationGate(input('incomplete', { area: 'fast-track' })).kind, 'gate');
    assert.equal(resolveManagerVerificationGate(input(null, { hasProfile: false, area: 'fast-track' })).kind, 'gate');
    assert.equal(resolveManagerVerificationGate(input('verification_required', { area: 'analytics' })).kind, 'gate');
    assert.equal(resolveManagerVerificationGate(input(null, { error: 'Network error', hasProfile: false, area: 'fast-track' })).kind, 'gate');
    assert.equal(resolveManagerVerificationGate(input('approved', { area: 'fast-track' })).kind, 'allow');
});

test('the copy promises exactly what stays open and what pauses', () => {
    assert.match(VERIFIED_MANAGER_AREA_DETAIL['fast-track'], /existing Fast Track cases stay open and you can keep working on them/);
    assert.match(VERIFIED_MANAGER_AREA_DETAIL['fast-track'], /new cases is paused/);
});
