import assert from 'node:assert/strict';
import test from 'node:test';
import { formatManagerPropertyPrice } from './managerPropertyPrice';

test('raw Dashboard and mapped Listings records have the same rental label', () => {
    const raw = { price: 25000, currency: 'INR', country: 'India', listing_type: 'rent' };
    const mapped = { price: { amount: 25000, currency: 'INR' }, priceString: '₹25,000', listingType: 'rent' };
    assert.equal(formatManagerPropertyPrice(raw), '₹25,000/month');
    assert.equal(formatManagerPropertyPrice(mapped), formatManagerPropertyPrice(raw));
});

test('UK rentals retain pounds and add the monthly frequency exactly once', () => {
    assert.equal(formatManagerPropertyPrice({ price: 1000, country: 'United Kingdom', listing_type: 'rent' }), '£1,000/month');
    assert.equal(formatManagerPropertyPrice({ priceString: '£1,000/month', listingType: 'rent' }), '£1,000/month');
    assert.equal(formatManagerPropertyPrice({ price: '£1,000', type: 'rent' }), '£1,000/month');
});

test('sale prices and missing prices do not acquire a rental frequency', () => {
    assert.equal(formatManagerPropertyPrice({ priceString: '₹25,00,000', listingType: 'sale' }), '₹25,00,000');
    assert.equal(formatManagerPropertyPrice({ listingType: 'rent' }), null);
    assert.equal(formatManagerPropertyPrice({ price: ' ', listingType: 'rent' }), null);
});
