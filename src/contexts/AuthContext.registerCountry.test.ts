import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRegisterPayload } from './AuthContext';

const names = { firstName: 'Asha', lastName: 'Rao' };
const terms = { acceptedAt: '2026-10-11T10:00:00.000Z', version: 'v1' };

test('seeker signup sends the country the person chose (same wire value the manager path uses)', () => {
    const payload = buildRegisterPayload(names, 'a@example.com', 'Passw0rd!', 'user', { ...terms, country: 'United Kingdom' });
    assert.equal(payload.country, 'United Kingdom');
    assert.equal(payload.role, 'user');
});

test('seeker signup omits country entirely when "Prefer not to say" is left selected', () => {
    for (const country of [undefined, '']) {
        const payload = buildRegisterPayload(names, 'a@example.com', 'Passw0rd!', 'user', { ...terms, country });
        assert.equal('country' in payload, false);
    }
});

test('manager signup keeps sending the chosen country', () => {
    const payload = buildRegisterPayload(names, 'm@example.com', 'Passw0rd!', 'manager', { ...terms, country: 'India' });
    assert.equal(payload.country, 'India');
});

test('the register payload still carries names, terms acceptance and role', () => {
    assert.deepEqual(buildRegisterPayload(names, 'a@example.com', 'Passw0rd!', 'user', terms), {
        first_name: 'Asha',
        last_name: 'Rao',
        email: 'a@example.com',
        password: 'Passw0rd!',
        role: 'user',
        accepted_terms: true,
        accepted_terms_version: 'v1',
        accepted_terms_at: '2026-10-11T10:00:00.000Z',
    });
});
