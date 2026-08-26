import test from 'node:test';
import assert from 'node:assert/strict';

import { getLeadMapCoordinates } from './leadMap';

const lead = (latitude?: number, longitude?: number) => ({
    id: 'lead-1',
    status: 'broker_responded',
    created_at: '2026-08-18T00:00:00Z',
    updated_at: '2026-08-18T00:00:00Z',
    property: {
        id: 'property-1',
        title: 'Chennai home',
        address_line_1: 'Anna Salai',
        city: 'Chennai',
        price: 1000000,
        image_urls: '',
        property_type: 'house',
        agent_name: 'Manager',
        latitude,
        longitude,
    },
});

test('lead map uses the selected property persisted coordinates', () => {
    assert.deepEqual(getLeadMapCoordinates(lead(13.0827, 80.2707)), [13.0827, 80.2707]);
});

test('lead map excludes missing and invalid property coordinates', () => {
    assert.equal(getLeadMapCoordinates(lead()), null);
    assert.equal(getLeadMapCoordinates(lead(91, 80.2707)), null);
    assert.equal(getLeadMapCoordinates(lead(13.0827, Number.NaN)), null);
});
