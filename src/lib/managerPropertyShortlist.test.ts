import assert from 'node:assert/strict';
import test from 'node:test';

import { selectShareablePortfolioProperties } from './managerPropertyShortlist';

const properties = [
    { id: 'sale-low', title: 'Sale low', listing_type: 'sale', price: 100_000 },
    { id: 'rent-high', title: 'Rent high', listing_type: 'rent', price: 1_000_000 },
    { id: 'lease-mid', title: 'Lease mid', listing_type: 'lease', price: 750_000 },
    { id: 'short-term', title: 'Short term', listing_type: 'short term rental', price: 500_000 },
    { id: 'sale-high', title: 'Sale high', listing_type: 'for sale', price: 900_000 },
];

test('buy shortlists sort only sale prices and exclude monthly rent', () => {
    assert.deepEqual(
        selectShareablePortfolioProperties(properties, { requestType: 'buy', sort: 'price_desc' }).map(({ id }) => id),
        ['sale-high', 'sale-low'],
    );
});

test('rent shortlists contain only rental properties', () => {
    assert.deepEqual(
        selectShareablePortfolioProperties(properties, { requestType: 'rent', sort: 'price_desc' }).map(({ id }) => id),
        ['rent-high', 'lease-mid', 'short-term'],
    );
});
