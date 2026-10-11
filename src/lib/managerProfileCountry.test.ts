import assert from 'node:assert/strict';
import test from 'node:test';

import {
    MANAGER_COUNTRY_LOCKED_HINT,
    MANAGER_PROFILE_COUNTRIES,
    isManagerCountryRefusal,
    resolveManagerProfileCountry,
} from './managerProfileCountry';
import { buildChangedProfileFields } from './profileUpdatePayload';

test('the manager profile offers exactly India and United Kingdom', () => {
    assert.deepEqual([...MANAGER_PROFILE_COUNTRIES], ['India', 'United Kingdom']);
});

test('the stored country is read from the user, then metadata, then the country code', () => {
    assert.equal(resolveManagerProfileCountry({ country: 'India' }), 'India');
    assert.equal(resolveManagerProfileCountry({ country: ' united kingdom ' }), 'United Kingdom');
    assert.equal(resolveManagerProfileCountry({ user_metadata: { country: 'GB' } }), 'United Kingdom');
    assert.equal(resolveManagerProfileCountry({ countryCode: 'IN' }), 'India');
    assert.equal(resolveManagerProfileCountry({ user_metadata: { country_code: 'gb' } }), 'United Kingdom');
});

test('an unset or unsupported country resolves to blank, never a guess', () => {
    assert.equal(resolveManagerProfileCountry(null), '');
    assert.equal(resolveManagerProfileCountry({}), '');
    assert.equal(resolveManagerProfileCountry({ country: 'France' }), '');
});

test('changing the country sends it on the profile update; leaving it alone sends nothing', () => {
    const loaded = { firstName: 'Asha', country: 'India' };
    assert.deepEqual(buildChangedProfileFields(loaded, { ...loaded, country: 'United Kingdom' }), { country: 'United Kingdom' });
    assert.deepEqual(buildChangedProfileFields(loaded, { ...loaded }), {});
});

test('the locked hint tells the manager to contact support', () => {
    assert.equal(MANAGER_COUNTRY_LOCKED_HINT, 'Contact support to change your country');
});

test('a server refusal about the country is recognised, other failures are not', () => {
    assert.equal(isManagerCountryRefusal("Your country can't be changed after verification. Contact support."), true);
    assert.equal(isManagerCountryRefusal('country must be India or United Kingdom'), true);
    assert.equal(isManagerCountryRefusal('Request timed out'), false);
    assert.equal(isManagerCountryRefusal(''), false);
});
