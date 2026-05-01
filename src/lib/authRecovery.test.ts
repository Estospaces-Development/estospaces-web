import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeRecoveryEmail, validateRecoveryEmail } from './authRecovery';

test('normalizeRecoveryEmail trims whitespace and lowercases input', () => {
    assert.equal(normalizeRecoveryEmail('  ADMIN@EXAMPLE.COM  '), 'admin@example.com');
});

test('validateRecoveryEmail rejects over-limit email addresses', () => {
    const overLimitEmail = `${'a'.repeat(245)}@example.com`;

    assert.equal(validateRecoveryEmail(overLimitEmail), 'Email must be 254 characters or fewer');
});
