import test from 'node:test';
import assert from 'node:assert/strict';

import { getLeadMapCoordinates } from './leadMap';
import type { Lead } from '@/services/leadsService';

const lead = (latitude?: number, longitude?: number): Lead => ({
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
    assert.equal(getLeadMapCoordinates(lead(86, 80.2707)), null);
    assert.equal(getLeadMapCoordinates(lead(13.0827, Number.NaN)), null);
    assert.equal(getLeadMapCoordinates(lead(0, 0)), null);
});

test('lead map rejects placeholder and country-inconsistent property coordinates', () => {
    assert.equal(getLeadMapCoordinates(lead(80.2707, 13.0827)), null);
    assert.equal(getLeadMapCoordinates({
        ...lead(51.5072, -0.1276),
        property: {
            ...lead(51.5072, -0.1276).property!,
            city: 'Chennai',
            postcode: '600001',
        },
    }), null);

    const unsupportedMarketLead = lead(37.3318, -122.0312);
    unsupportedMarketLead.property!.country = 'United States';
    unsupportedMarketLead.property!.city = 'Cupertino';
    unsupportedMarketLead.property!.postcode = '95014';
    assert.equal(getLeadMapCoordinates(unsupportedMarketLead), null);
});

test('lead map accepts verified coordinates inside the property market', () => {
    const ukLead = lead(51.5072, -0.1276);
    ukLead.property!.title = 'London home';
    ukLead.property!.city = 'London';
    ukLead.property!.postcode = 'SW1A 1AA';

    assert.deepEqual(getLeadMapCoordinates(lead(13.0827, 80.2707)), [13.0827, 80.2707]);
    assert.deepEqual(getLeadMapCoordinates(ukLead), [51.5072, -0.1276]);
});
