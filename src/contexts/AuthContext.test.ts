import test from 'node:test';
import assert from 'node:assert/strict';
import { splitRegistrationName } from './AuthContext';

test('registration name split leaves one-word names unduplicated', () => {
    assert.deepEqual(splitRegistrationName('Managerrr'), {
        first_name: 'Managerrr',
        last_name: '',
    });
});

test('registration name split keeps remaining words as the last name', () => {
    assert.deepEqual(splitRegistrationName('  Property   Manager  Team  '), {
        first_name: 'Property',
        last_name: 'Manager Team',
    });
});
