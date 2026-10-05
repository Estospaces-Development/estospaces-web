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

test('share picker only offers homes from the request market (UK vs India)', () => {
    const portfolio = [
        { id: 'chennai', title: 'OcenView', city: 'Chennai', postcode: '600001', country: 'India', price: 25000, listing_type: 'rent' },
        { id: 'london', title: 'London Flat', city: 'London', postcode: 'SW1A 1AA', country: 'United Kingdom', price: 2500, listing_type: 'rent' },
        { id: 'unknown', title: 'No country yet', price: 900, listing_type: 'rent' },
    ];

    const london = selectShareablePortfolioProperties(portfolio, { requestType: 'rent', requestLocationCode: 'SW1A 2AA', sort: 'title_asc' });
    assert.deepEqual(london.map((property) => property.id), ['london', 'unknown']);

    const chennai = selectShareablePortfolioProperties(portfolio, { requestType: 'rent', requestLocationCode: '600001', sort: 'title_asc' });
    assert.deepEqual(chennai.map((property) => property.id), ['unknown', 'chennai']);

    const noCode = selectShareablePortfolioProperties(portfolio, { requestType: 'rent', sort: 'title_asc' });
    assert.equal(noCode.length, 3);
});
