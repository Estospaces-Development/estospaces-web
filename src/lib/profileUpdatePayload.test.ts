import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildChangedProfileFields,
    normalizeProfileAddress,
    type ProfileFormValues,
} from './profileUpdatePayload';

const loaded: ProfileFormValues = {
    firstName: 'Mary Ann',
    lastName: 'Smith',
    phone: '+44 20 1234 5678',
    address: 'Flat 4B, Test House\n18 Example Road',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
};

test('an unchanged form produces an empty payload', () => {
    assert.deepEqual(buildChangedProfileFields(loaded, { ...loaded }), {});
});

test('a stale session that edits only the address sends only the address (QA-MB-20260923-01-032)', () => {
    // Session B loaded the profile before session A renamed the user. B then
    // edits only the address; the payload must not carry B's stale name.
    const payload = buildChangedProfileFields(loaded, {
        ...loaded,
        address: 'QA Flat 9\n1 Other Road',
    });
    assert.deepEqual(payload, { address: 'QA Flat 9\n1 Other Road' });
    assert.equal('first_name' in payload, false);
    assert.equal('last_name' in payload, false);
});

test('first and last name are sent as separate wire fields without re-splitting', () => {
    const payload = buildChangedProfileFields(loaded, {
        ...loaded,
        firstName: 'Anne Marie',
        lastName: 'de la Cruz',
    });
    assert.deepEqual(payload, { first_name: 'Anne Marie', last_name: 'de la Cruz' });
});

test('whitespace-only edits are not treated as changes, and changed values are trimmed', () => {
    assert.deepEqual(buildChangedProfileFields(loaded, { ...loaded, phone: ' +44 20 1234 5678 ' }), {});
    assert.deepEqual(buildChangedProfileFields(loaded, { ...loaded, lastName: '   ' }), { last_name: '' });
});

test('clearing an optional field sends an explicit empty string', () => {
    assert.deepEqual(buildChangedProfileFields(loaded, { ...loaded, phone: '' }), { phone: '' });
});

test('address line breaks are preserved, and CRLF vs LF alone is not a change (QA-MB-20260923-01-034)', () => {
    assert.equal(normalizeProfileAddress('Line 1\r\nLine 2\rLine 3\n'), 'Line 1\nLine 2\nLine 3');
    assert.deepEqual(
        buildChangedProfileFields(
            { address: 'Flat 4B, Test House\r\n18 Example Road' },
            { address: 'Flat 4B, Test House\n18 Example Road' },
        ),
        {},
    );
    assert.deepEqual(
        buildChangedProfileFields({ address: 'salem attur' }, { address: 'QA Flat 4B, Test House\r\n18 Example Road, Chennai 600001' }),
        { address: 'QA Flat 4B, Test House\n18 Example Road, Chennai 600001' },
    );
});

test('fields absent from the current values are never sent', () => {
    assert.deepEqual(buildChangedProfileFields(loaded, { phone: '07000 000000' }), { phone: '07000 000000' });
});
