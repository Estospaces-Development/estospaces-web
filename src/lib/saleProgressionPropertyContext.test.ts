import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    applicationNeedsCurrentPropertyContext,
    buildPropertyContextFromProperty,
    hydrateApplicationPropertyContexts,
    hydrateMissingSaleProgressionPropertyContexts,
    mapBackendApplication,
    mergePropertyContexts,
} from '../contexts/ApplicationsContext';

const applicationsContextSource = readFileSync(
    resolve(import.meta.dirname, '..', 'contexts', 'ApplicationsContext.tsx'),
    'utf8',
);

test('legacy application context merges missing snapshot fields from viewing data', () => {
    const merged = mergePropertyContexts(
        {
            title: 'QA Issue 1234567890',
            address: 'Address unavailable',
            price: 0,
            currency: '',
        },
        {
            title: 'Chennai Garden Home',
            address: '12 Marina Road, Chennai',
            price: 125000,
            currency: 'INR',
            agentName: 'SRINI Agency',
        },
    );

    assert.equal(merged.title, 'Chennai Garden Home');
    assert.equal(merged.address, '12 Marina Road, Chennai');
    assert.equal(merged.price, 125000);
    assert.equal(merged.currency, 'INR');
    assert.equal(merged.agentName, 'SRINI Agency');
});

test('sign-out invalidates pending background application hydration', () => {
    assert.match(
        applicationsContextSource,
        /if \(!user\) \{\s*fetchRevisionRef\.current \+= 1;\s*setApplications\(\[\]\)/,
    );
});

test('sale progressions consume refreshed application property context', () => {
    assert.match(
        applicationsContextSource,
        /refreshedApplicationPropertyContextById\.get\(progression\.property_id\)\s*\|\|\s*propertyContextById\.get\(progression\.property_id\)/,
    );
});

test('application property refresh is limited to incomplete or internal QA snapshots', () => {
    assert.equal(applicationNeedsCurrentPropertyContext({
        property_title: 'Canal View Apartment',
        property_address: '2 Canal Road, London',
        property_country: 'United Kingdom',
        property_currency: 'GBP',
        property_image: 'https://example.test/property.jpg',
        property_price: 250000,
        property_type: 'apartment',
        agent_name: 'Canal Estates',
    }), false);
    assert.equal(applicationNeedsCurrentPropertyContext({
        property_title: 'Launch Rent 1774522500236',
        property_address: 'Address unavailable',
        property_image: '',
        property_price: 0,
        agent_name: '',
    }), true);
});

test('application mapping treats whitespace snapshot context as missing', () => {
    const mapped = mapBackendApplication({
        id: 'application-whitespace',
        property_id: 'property-1',
        user_id: 'user-1',
        status: 'submitted',
        listing_type: 'sale',
        created_at: '2026-08-16T08:00:00Z',
        updated_at: '2026-08-16T08:00:00Z',
        property_country: '   ',
        property_currency: '   ',
        property_type: '   ',
        agent_name: '   ',
        agent_agency: '   ',
        agent_email: '   ',
        agent_phone: '   ',
    } as any, undefined, {
        country: 'United Kingdom',
        currency: 'GBP',
        propertyType: 'flat',
        agentName: 'Current Agent',
        agentAgency: 'Current Agency',
        agentEmail: 'current@example.test',
        agentPhone: '+44 20 7000 0000',
    });

    assert.equal(mapped.propertyCountry, 'United Kingdom');
    assert.equal(mapped.propertyCurrency, 'GBP');
    assert.equal(mapped.propertyType, 'flat');
    assert.equal(mapped.agentName, 'Current Agent');
    assert.equal(mapped.agentAgency, 'Current Agency');
    assert.equal(mapped.agentEmail, 'current@example.test');
    assert.equal(mapped.agentPhone, '+44 20 7000 0000');
});

test('application mapping rejects a workflow status inherited from another snapshot', () => {
    const mapped = mapBackendApplication({
        id: 'application-submitted',
        property_id: 'property-1',
        user_id: 'user-1',
        status: 'submitted',
        listing_type: 'sale',
        property_title: 'Submitted',
        property_address: 'Address unavailable',
        created_at: '2026-08-16T08:00:00Z',
        updated_at: '2026-08-16T08:00:00Z',
    } as any, undefined, {
        title: 'Cancelled',
        address: 'Address unavailable',
    });

    assert.equal(mapped.propertyTitle, 'Property');
});

test('application mapping rejects a stale workflow title after the status advances', () => {
    const mapped = mapBackendApplication({
        id: 'application-under-review',
        property_id: 'property-1',
        user_id: 'user-1',
        status: 'under_review',
        listing_type: 'sale',
        property_title: 'Submitted',
        property_address: 'Address unavailable',
        created_at: '2026-08-16T08:00:00Z',
        updated_at: '2026-08-16T08:30:00Z',
    } as any, undefined, {
        title: 'Canal View Apartment',
        address: '2 Canal Road, London',
    });

    assert.equal(mapped.propertyTitle, 'Canal View Apartment');
});

test('legacy application snapshots without country or currency request current property context', () => {
    assert.equal(applicationNeedsCurrentPropertyContext({
        property_title: 'Complete legacy title',
        property_address: '1 Legacy Road, London',
        property_country: '',
        property_currency: '',
        property_image: 'https://example.test/legacy.jpg',
        property_price: 500000,
        agent_name: 'Legacy Agent',
    }), true);
});

test('application property hydration replaces stale snapshots with current property context', async () => {
    const propertyContextById = new Map<string, any>([['property-1', { title: 'QA stale title 20260816123456' }]]);

    await hydrateApplicationPropertyContexts(
        [{ property_id: 'property-1' }] as any,
        propertyContextById,
        async () => ({
            data: {
                id: 'property-1',
                title: 'Canal View Apartment',
                property_type: 'apartment',
                listing_type: 'sale',
                status: 'published',
                price: 250000,
                currency: 'GBP',
                bedrooms: 2,
                bathrooms: 2,
                address_line_1: '2 Canal Road',
                city: 'London',
                postcode: 'E14 5AB',
                country: 'United Kingdom',
                agent_name: 'Canal Estates',
            },
            error: null,
        }),
    );

    assert.equal(propertyContextById.get('property-1')?.title, 'Canal View Apartment');
    assert.equal(propertyContextById.get('property-1')?.agentName, 'Canal Estates');
});

test('applications for the same property retain their own snapshots until an authoritative refresh is available', () => {
    const baseApplication = {
        property_id: 'property-1',
        user_id: 'user-1',
        status: 'submitted',
        listing_type: 'rent',
        created_at: '2026-08-16T08:00:00Z',
        updated_at: '2026-08-16T08:00:00Z',
    };
    const first = mapBackendApplication({
        ...baseApplication,
        id: 'application-1',
        property_title: 'Original application snapshot',
        property_address: '1 Original Road',
    } as any);
    const second = mapBackendApplication({
        ...baseApplication,
        id: 'application-2',
        property_title: 'Later application snapshot',
        property_address: '2 Later Road',
    } as any);

    assert.equal(first.propertyTitle, 'Original application snapshot');
    assert.equal(first.propertyAddress, '1 Original Road');
    assert.equal(second.propertyTitle, 'Later application snapshot');
    assert.equal(second.propertyAddress, '2 Later Road');
});

test('partial application hydration fills missing fields without rewriting its historical snapshot', () => {
    const mapped = mapBackendApplication({
        id: 'application-1',
        property_id: 'property-1',
        user_id: 'user-1',
        status: 'submitted',
        listing_type: 'sale',
        created_at: '2026-08-16T08:00:00Z',
        updated_at: '2026-08-16T08:00:00Z',
        property_title: 'Original listing title',
        property_address: '1 Original Road, London',
        property_price: 225000,
        property_type: 'flat',
        agent_name: 'Original Agent',
    } as any, undefined, {
        title: 'Renamed current listing',
        address: '99 Current Road, Bristol',
        image: 'https://example.test/current-property.jpg',
        price: 300000,
        propertyType: 'house',
        agentName: 'Current Agent',
    });

    assert.equal(mapped.propertyTitle, 'Original listing title');
    assert.equal(mapped.propertyAddress, '1 Original Road, London');
    assert.equal(mapped.propertyPrice, 225000);
    assert.equal(mapped.propertyType, 'flat');
    assert.equal(mapped.agentName, 'Original Agent');
    assert.equal(mapped.propertyImage, 'https://example.test/current-property.jpg');
});

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
        country: 'United Kingdom',
        currency: 'GBP',
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
        country: 'United Kingdom',
        currency: 'GBP',
        propertyType: 'house',
        agentName: undefined,
        agentAgency: undefined,
        agentEmail: undefined,
        agentPhone: undefined,
    });
});
