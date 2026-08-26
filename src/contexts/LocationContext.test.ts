import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveProfileLocation, resolveSearchLocationCode } from './LocationContext';

test('profile location uses the saved postcode even when address is blank', () => {
    assert.deepEqual(resolveProfileLocation({ postcode: 'SW1A 1AA', address: '' }), {
        postcode: 'SW1A 1AA',
    });
});

test('profile location still extracts a postcode from a legacy address', () => {
    assert.deepEqual(resolveProfileLocation({ address: '10 Downing Street, London SW1A 2AA' }), {
        postcode: 'SW1A 2AA',
    });
});

test('profile location ignores an invalid saved postcode and uses the address postcode', () => {
    assert.deepEqual(resolveProfileLocation({
        postcode: 'N/A',
        address: '10 Downing Street, London SW1A 2AA',
    }), {
        postcode: 'SW1A 2AA',
    });
});

test('map search anchors only supported PIN and postcode values', () => {
    assert.equal(resolveSearchLocationCode('Mumbai'), null);
    assert.equal(resolveSearchLocationCode('Mumbai 400001'), '400001');
    assert.equal(resolveSearchLocationCode('London SW1A 1AA'), 'SW1A 1AA');
});
