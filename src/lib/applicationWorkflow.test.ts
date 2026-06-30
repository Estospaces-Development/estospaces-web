import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApplicationPropertySnapshot, findRelatedViewing } from './applicationWorkflow';

test('buildApplicationPropertySnapshot carries display and agent fields from a property', () => {
    const snapshot = buildApplicationPropertySnapshot({
        title: 'Luxurious 3BHK in Preston - JEEVI Groups',
        address_line_1: '123, Preston',
        city: 'Preston',
        postcode: 'SW1A 1AA',
        image_urls: '["https://example.test/property.jpg"]',
        property_type: 'house',
        listing_type: 'sale',
        price: 10000,
        agent_name: 'Estospaces Dev',
        agent_email: 'estospacesdev@gmail.com',
        agent_phone: '9677697624',
        agent_company: 'JEEVI Groups',
    });

    assert.deepEqual(snapshot, {
        property_title: 'Luxurious 3BHK in Preston - JEEVI Groups',
        property_address: '123, Preston',
        property_image: 'https://example.test/property.jpg',
        property_type: 'house',
        listing_type: 'sale',
        property_price: 10000,
        agent_name: 'Estospaces Dev',
        agent_email: 'estospacesdev@gmail.com',
        agent_phone: '9677697624',
        agent_agency: 'JEEVI Groups',
    });
});

test('buildApplicationPropertySnapshot falls back to city and postcode address', () => {
    const snapshot = buildApplicationPropertySnapshot({
        title: 'City flat',
        city: 'Oxford',
        postcode: 'OX1 1AA',
        image_urls: ['https://example.test/one.jpg'],
        listing_type: 'rent',
    });

    assert.equal(snapshot.property_address, 'Oxford, OX1 1AA');
    assert.equal(snapshot.property_image, 'https://example.test/one.jpg');
    assert.equal(snapshot.listing_type, 'rent');
});

test('findRelatedViewing prefers direct application links over property/user heuristics', () => {
    const relatedViewing = findRelatedViewing(
        {
            id: 'application-1',
            property_id: 'property-1',
            user_id: 'user-1',
            move_in_date: '2026-05-01',
            status: 'viewing_scheduled',
            created_at: '2026-03-24T10:00:00Z',
            updated_at: '2026-03-24T10:00:00Z',
        },
        [
            {
                id: 'viewing-legacy',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                scheduled_at: '2026-03-30T11:00:00Z',
                duration_minutes: 30,
                viewing_type: 'in_person',
                status: 'confirmed',
                created_at: '2026-03-24T10:00:00Z',
            },
            {
                id: 'viewing-linked',
                property_id: 'property-2',
                user_id: 'user-2',
                manager_id: 'manager-2',
                application_id: 'application-1',
                scheduled_at: '2026-03-31T11:00:00Z',
                duration_minutes: 30,
                viewing_type: 'in_person',
                status: 'confirmed',
                created_at: '2026-03-24T11:00:00Z',
            },
        ],
    );

    assert.equal(relatedViewing?.id, 'viewing-linked');
});

test('findRelatedViewing falls back to property and user when legacy viewings have no application_id', () => {
    const relatedViewing = findRelatedViewing(
        {
            id: 'application-2',
            property_id: 'property-9',
            user_id: 'user-9',
            move_in_date: '2026-05-01',
            status: 'submitted',
            created_at: '2026-03-24T10:00:00Z',
            updated_at: '2026-03-24T10:00:00Z',
        },
        [
            {
                id: 'viewing-older',
                property_id: 'property-9',
                user_id: 'user-9',
                manager_id: 'manager-9',
                scheduled_at: '2026-03-28T11:00:00Z',
                duration_minutes: 30,
                viewing_type: 'in_person',
                status: 'confirmed',
                created_at: '2026-03-24T09:00:00Z',
            },
            {
                id: 'viewing-latest',
                property_id: 'property-9',
                user_id: 'user-9',
                manager_id: 'manager-9',
                scheduled_at: '2026-03-29T11:00:00Z',
                duration_minutes: 30,
                viewing_type: 'in_person',
                status: 'rescheduled',
                created_at: '2026-03-24T10:00:00Z',
            },
        ],
    );

    assert.equal(relatedViewing?.id, 'viewing-latest');
});
