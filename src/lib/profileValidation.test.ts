import assert from 'node:assert/strict';
import test from 'node:test';

import { validateFullName, validateProfileNameFields } from './profileValidation';

test('validateFullName rejects over-limit full names', () => {
    assert.equal(validateFullName('a'.repeat(161)), 'Full name must be 160 characters or fewer');
});

test('validateProfileNameFields rejects blank and over-limit name fields', () => {
    assert.deepEqual(validateProfileNameFields({ firstName: '   ', lastName: 'User' }), {
        firstName: 'First name is required',
    });

    assert.deepEqual(validateProfileNameFields({ firstName: 'Admin', lastName: 'a'.repeat(81) }), {
        lastName: 'Last name must be 80 characters or fewer',
    });
});
