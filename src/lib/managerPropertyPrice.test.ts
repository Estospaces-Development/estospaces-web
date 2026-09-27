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

test('an unset price of 0 is not shown as a real amount and fallbacks get no period', () => {
    assert.equal(formatManagerPropertyPrice({ price: 0, country: 'India', listing_type: 'rent' }), null);
    assert.equal(formatManagerPropertyPrice({ price: { amount: 0, currency: 'INR' }, listingType: 'sale' }), null);
    assert.equal(formatManagerPropertyPrice({ priceString: 'POA', listingType: 'rent' }), 'POA');
});

test('fractional prices keep their paise instead of rounding', () => {
    assert.equal(formatManagerPropertyPrice({ price: 1234567.89, currency: 'INR', country: 'India', listing_type: 'sale' }), '₹12,34,567.89');
    assert.equal(formatManagerPropertyPrice({ price: 1234567, currency: 'INR', country: 'India', listing_type: 'sale' }), '₹12,34,567');
});

test('admin property card and detail use the shared rental-aware price label', async () => {
    const { readFileSync } = await import('node:fs');
    for (const file of ['src/pages/admin/properties/page.tsx', 'src/pages/admin/properties/[id]/page.tsx']) {
        const source = readFileSync(`${process.cwd()}/${file}`, 'utf8');
        assert.ok(source.includes('formatManagerPropertyPrice({'), file);
        assert.ok(!source.includes('formatLaunchCurrencyForCountry('), file);
    }
});

test('signed-in Discover cards read listing_type to label rentals', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(`${process.cwd()}/src/components/dashboard/PropertyCard.tsx`, 'utf8');
    assert.ok(source.includes("const isRentalListing = property.listing_type === 'rent' || property.listingType === 'rent'"));
    assert.equal(source.split('if (isRentalListing) {').length - 1, 2);
});
