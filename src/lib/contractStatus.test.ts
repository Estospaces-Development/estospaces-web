import assert from 'node:assert/strict';
import test from 'node:test';
import { isPendingManagerSignature, isPendingUserSignature, normalizeContractStatus } from './contractStatus';

test('normalizeContractStatus maps legacy pending statuses to canonical values', () => {
    assert.equal(normalizeContractStatus('pending_user'), 'pending_user_signature');
    assert.equal(normalizeContractStatus('pending_manager'), 'pending_manager_signature');
});

test('normalizeContractStatus keeps canonical values stable', () => {
    assert.equal(normalizeContractStatus('draft'), 'draft');
    assert.equal(normalizeContractStatus('active'), 'active');
    assert.equal(normalizeContractStatus('terminated'), 'terminated');
});

test('pending signature helpers accept both canonical and legacy values', () => {
    assert.equal(isPendingUserSignature('pending_user_signature'), true);
    assert.equal(isPendingUserSignature('pending_user'), true);
    assert.equal(isPendingManagerSignature('pending_manager_signature'), true);
    assert.equal(isPendingManagerSignature('pending_manager'), true);
});
