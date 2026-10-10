import assert from 'node:assert/strict';
import test from 'node:test';

import type { VerificationStatus } from '@/services/managerVerificationService';
import {
    MANAGER_READ_ONLY_ERROR_CODE,
    MANAGER_VERIFICATION_UNAVAILABLE_ERROR_CODE,
    MANAGER_VIEW_ONLY_HINT,
    MANAGER_VIEW_ONLY_REASON,
    isManagerVerificationGuardErrorCode,
    isManagerViewOnly,
    resolveManagerViewOnly,
} from './managerViewOnly';

// Owner decision (10 Oct 2026): rejected or revoked managers are read-only; everyone else keeps working.
test('only a rejected (or revoked) manager is view only', () => {
    const expected: Record<VerificationStatus, boolean> = {
        rejected: true,
        approved: false,
        submitted: false,
        under_review: false,
        verification_required: false,
        incomplete: false,
    };
    for (const [status, viewOnly] of Object.entries(expected)) {
        assert.equal(isManagerViewOnly(status as VerificationStatus), viewOnly, status);
    }
    // No profile or no answer yet is never treated as a restriction; booking is the enforcer.
    assert.equal(isManagerViewOnly(null), false);
    assert.equal(isManagerViewOnly(undefined), false);
    assert.equal(isManagerViewOnly('unknown'), false);
});

// A rejected manager who resubmits shows as pending review, but core keeps them read-only until an admin approves again.
test('core booking_read_only keeps a resubmitted rejected manager view only', () => {
    assert.equal(resolveManagerViewOnly('submitted', true), true);
    assert.equal(resolveManagerViewOnly('under_review', true), true);
    assert.equal(resolveManagerViewOnly('rejected', false), true);
    assert.equal(resolveManagerViewOnly('rejected', undefined), true);
    assert.equal(resolveManagerViewOnly('approved', false), false);
    assert.equal(resolveManagerViewOnly('submitted', false), false);
    assert.equal(resolveManagerViewOnly('verification_required', undefined), false);
    assert.equal(resolveManagerViewOnly(null, null), false);
});

test('the view-only copy matches booking and names the way back', () => {
    // Same sentence booking sends with its 403, so a blocked click and a refused request read alike.
    assert.equal(
        MANAGER_VIEW_ONLY_REASON,
        'Your manager verification was rejected or revoked. You can view your cases but cannot make changes until an admin re-approves you.',
    );
    assert.match(MANAGER_VIEW_ONLY_HINT, /admin re-approves you/);
});

test('booking guard error codes are recognised and ordinary codes are not', () => {
    assert.equal(MANAGER_READ_ONLY_ERROR_CODE, 'manager_read_only');
    assert.equal(MANAGER_VERIFICATION_UNAVAILABLE_ERROR_CODE, 'manager_verification_unavailable');
    assert.equal(isManagerVerificationGuardErrorCode('manager_read_only'), true);
    assert.equal(isManagerVerificationGuardErrorCode('manager_verification_unavailable'), true);
    assert.equal(isManagerVerificationGuardErrorCode('validation_failed'), false);
    assert.equal(isManagerVerificationGuardErrorCode(undefined), false);
    assert.equal(isManagerVerificationGuardErrorCode(null), false);
});
