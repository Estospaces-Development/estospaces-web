import test from 'node:test';
import assert from 'node:assert/strict';

import { getSavedSearchNameError, normalizeSavedSearchName } from '@/lib/savedSearchValidation';

test('saved search names normalize whitespace', () => {
    assert.equal(normalizeSavedSearchName('  Attur   Alerts  '), 'Attur Alerts');
});

test('saved search name validation rejects blank invalid and over-limit names', () => {
    assert.equal(getSavedSearchNameError('   '), 'Search name is required.');
    assert.match(getSavedSearchNameError('<script>'), /letters/);
    assert.match(getSavedSearchNameError('a'.repeat(81)), /80 characters/);
});

test('saved search name validation accepts common property-search punctuation', () => {
    assert.equal(getSavedSearchNameError("2 Bed - Attur (rent/sale)"), '');
});
