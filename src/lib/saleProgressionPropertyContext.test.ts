import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildPropertyContextFromProperty,
    hydrateMissingSaleProgressionPropertyContexts,
} from '../contexts/ApplicationsContext';

test('buildPropertyContextFromProperty maps sale progression display fields from a property', () => {
    const context = buildPropertyContextFromProperty({
        id: 'property-1',
        title: 'Codex QA Sale Offer Manager',
        property_type: 'apartment',
        listing_type: 'sale',
        status: 'published',
        price: 126000,
        currency: 'GBP',
        bedrooms: 2,
        bathrooms: 2,
        address_line_1: '10 Codex QA Street',
        address_line_2: 'Flat 4',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom',
        image_urls: '["https://example.test/property.jpg"]' as any,
        agent_name: 'Estospaces QA',
        agent_company: 'Codex QA Estates',
        agent_email: 'manager@example.test',
        agent_phone: '07123456789',
    });

    assert.deepEqual(context, {
        title: 'Codex QA Sale Offer Manager',
        address: '10 Codex QA Street, Flat 4, London, SW1A 1AA, United Kingdom',
        image: 'https://example.test/property.jpg',
        price: 126000,
        propertyType: 'apartment',
        agentName: 'Estospaces QA',
        agentAgency: 'Codex QA Estates',
        agentEmail: 'manager@example.test',
        agentPhone: '07123456789',
    });
});

test('hydrateMissingSaleProgressionPropertyContexts fetches direct-offer sale properties', async () => {
    const propertyContextById = new Map();
    const fetchedPropertyIds: string[] = [];

    await hydrateMissingSaleProgressionPropertyContexts(
        [
            {
                id: 'progression-1',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                current_stage: 'memorandum_issued',
                status: 'active',
                created_at: '2026-06-17T12:00:00Z',
                updated_at: '2026-06-17T12:05:00Z',
            },
        ] as any,
        propertyContextById,
        async (propertyId) => {
            fetchedPropertyIds.push(propertyId);
            return {
                data: {
                    id: propertyId,
                    title: 'Direct offer sale home',
                    property_type: 'house',
                    listing_type: 'sale',
                    status: 'published',
                    price: 250000,
                    currency: 'GBP',
                    bedrooms: 3,
                    bathrooms: 2,
                    address_line_1: '42 Market Street',
                    city: 'Bristol',
                    postcode: 'BS1 1AA',
                    country: 'United Kingdom',
                },
                error: null,
            };
        },
    );

    assert.deepEqual(fetchedPropertyIds, ['property-1']);
    assert.deepEqual(propertyContextById.get('property-1'), {
        title: 'Direct offer sale home',
        address: '42 Market Street, Bristol, BS1 1AA, United Kingdom',
        image: undefined,
        price: 250000,
        propertyType: 'house',
        agentName: undefined,
        agentAgency: undefined,
        agentEmail: undefined,
        agentPhone: undefined,
    });
});
