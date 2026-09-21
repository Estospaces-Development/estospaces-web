import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeManagerBranchNameInput } from './managerProfileInput';

test('preserves a single trailing space while a manager types a branch name', () => {
    assert.equal(normalizeManagerBranchNameInput('Chennai '), 'Chennai ');
    assert.equal(normalizeManagerBranchNameInput('Chennai Branch'), 'Chennai Branch');
});

test('collapses accidental repeated spaces in a branch name', () => {
    assert.equal(normalizeManagerBranchNameInput('Chennai   Branch'), 'Chennai Branch');
});
