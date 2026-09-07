import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { PropertyProvider } from '@/contexts/PropertyContext';
import { WorkspaceSyncProvider } from '@/contexts/WorkspaceSyncContext';
import ManagerPropertyCard from './ManagerPropertyCard';

const renderCard = (property: React.ComponentProps<typeof ManagerPropertyCard>['property']) => (
    renderToStaticMarkup(
        <MemoryRouter>
            <WorkspaceSyncProvider>
                <PropertyProvider scope="manager" enabled={false}>
                    <ManagerPropertyCard property={property} />
                </PropertyProvider>
            </WorkspaceSyncProvider>
        </MemoryRouter>,
    )
);

const baseProperty = {
    id: 'rental-price-regression',
    title: 'Rental price regression',
    status: 'draft',
    price: 25000,
    currency: 'INR',
    country: 'India',
};

test('raw dashboard rental price includes the monthly frequency', () => {
    const property = { ...baseProperty, listing_type: 'rent' };
    assert.match(renderCard(property), /₹25,000\/month/);
});

test('mapped Listings rental price retains the monthly frequency', () => {
    assert.match(renderCard({
        ...baseProperty,
        listingType: 'rent',
        price: { amount: 25000, currency: 'INR', negotiable: false },
        priceString: '₹25,000',
    }), /₹25,000\/month/);
});

test('raw UK rental price retains its currency and monthly frequency', () => {
    const property = {
        ...baseProperty, listing_type: 'rent', country: 'United Kingdom', currency: 'GBP', price: 1000,
    };
    assert.match(renderCard(property), /£1,000\/month/);
});

test('sale and unspecified listings never gain a monthly price suffix', () => {
    for (const property of [
        { ...baseProperty, listing_type: 'sale' },
        { ...baseProperty, listingType: 'sale' as const },
        baseProperty,
    ]) {
        const markup = renderCard(property);
        assert.match(markup, /₹25,000/);
        assert.doesNotMatch(markup, /\/month/);
    }
});

test('legacy rental records retain the monthly frequency', () => {
    assert.match(renderCard({ ...baseProperty, type: 'rent' }), /₹25,000\/month/);
});
