import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { PropertyProvider } from '@/contexts/PropertyContext';
import { WorkspaceSyncProvider } from '@/contexts/WorkspaceSyncContext';
import ManagerPropertyCard from './ManagerPropertyCard';

type CardProperty = React.ComponentProps<typeof ManagerPropertyCard>['property'];
const baseProperty: CardProperty = {
    id: 'draft-completeness-regression', title: 'Draft apartment', status: 'draft',
    bedrooms: 0, bathrooms: 0, property_size_sqft: 0, price: 2000000,
    currency: 'INR', country: 'India', listing_type: 'sale',
};
const renderCard = (overrides: Partial<CardProperty> = {}) => renderToStaticMarkup(
    <MemoryRouter><WorkspaceSyncProvider><PropertyProvider scope="manager" enabled={false}>
        <ManagerPropertyCard property={{ ...baseProperty, ...overrides }} />
    </PropertyProvider></WorkspaceSyncProvider></MemoryRouter>,
);

test('incomplete draft explains the missing area without discarding the saved price', () => {
    const markup = renderCard();
    assert.match(markup, /Draft incomplete/);
    assert.match(markup, /Add property area before submitting for approval\./);
    assert.match(markup, /₹20,00,000/);
    assert.match(markup, />Edit</);
});

test('missing area in a draft also shows the completion guidance', () => {
    assert.match(renderCard({ property_size_sqft: undefined }), /Draft incomplete/);
    assert.match(renderCard({ status: ' DRAFT ' }), /Draft incomplete/);
});

test('positive raw and mapped area removes the specific missing-area notice even with zero bedrooms', () => {
    for (const fields of [{ property_size_sqft: 900 }, { area: 900 }, { sqft: 900 }]) {
        assert.doesNotMatch(renderCard(fields), /Draft incomplete|Add property area/);
    }
});

test('non-draft listings do not get draft editing instructions', () => {
    for (const status of ['published', 'pending_approval', 'rejected', 'rented', 'sold']) {
        assert.doesNotMatch(renderCard({ status }), /Draft incomplete|Add property area/);
    }
});

test('incomplete rental draft retains the monthly price', () => {
    const markup = renderCard({ listing_type: 'rent', price: 25000 });
    assert.match(markup, /Draft incomplete/);
    assert.match(markup, /₹25,000\/month/);
});
