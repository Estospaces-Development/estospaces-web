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
    id: 'floor-caption-regression',
    title: 'Floor caption regression',
    status: 'available',
    price: 25000,
    currency: 'INR',
    country: 'India',
};

test('manager card shows the flat position instead of building floors as available units', () => {
    const markup = renderCard({ ...baseProperty, property_type: 'apartment', floor_number: 3, total_floors: 6, occupied_units: 0 });

    assert.match(markup, /Floor 3 of 6/);
    assert.doesNotMatch(markup, /floors available/);
});

test('manager card shows a ground-floor flat as the ground floor, and an unknown floor as the building', () => {
    const ground = renderCard({ ...baseProperty, property_type: 'apartment', floor_number: 0, total_floors: 6, occupied_units: 0 });
    assert.match(ground, /Ground floor of 6/);

    const unknown = renderCard({ ...baseProperty, property_type: 'apartment', floor_number: null, total_floors: 6, occupied_units: 0 });
    assert.match(unknown, /6-floor building/);
    assert.doesNotMatch(unknown, /Ground floor/);
});

test('manager card keeps whole-building occupancy captions for commercial listings', () => {
    const markup = renderCard({ ...baseProperty, property_type: 'commercial', floor_number: 3, total_floors: 6, occupied_units: 2 });

    assert.match(markup, /2 of 6 floors occupied/);
    assert.doesNotMatch(markup, /Floor 3 of 6/);
});
