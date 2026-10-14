import assert from 'node:assert/strict';
import test from 'node:test';

import { getDefaultContractTerms, resolveContractMarket } from './contractDefaults';

test('default contract terms follow the property market', () => {
    assert.equal(resolveContractMarket('GB'), 'GB');
    assert.equal(resolveContractMarket('United Kingdom'), 'GB');
    assert.equal(resolveContractMarket(undefined, 'GBP'), 'GB');
    assert.equal(resolveContractMarket('India', 'INR'), 'IN');
    assert.equal(resolveContractMarket(), 'IN');
    assert.match(getDefaultContractTerms('GB'), /Assured Shorthold Tenancy/);
    assert.doesNotMatch(getDefaultContractTerms('IN'), /Assured Shorthold|England/i);
});
