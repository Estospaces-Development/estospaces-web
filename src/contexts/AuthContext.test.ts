import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVerificationEmailSent, splitRegistrationName } from './AuthContext';

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

test('registration preserves an explicit provider delivery failure from the API', () => {
    assert.equal(resolveVerificationEmailSent({
        data: {
            verification_email_sent: false,
        },
    }), false);
});

test('registration remains compatible with responses created before delivery status existed', () => {
    assert.equal(resolveVerificationEmailSent({ data: { user: { id: 'user-1' } } }), true);
});
