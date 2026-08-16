import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    buildAdminPropertyRegistryServiceSort,
    ADMIN_PROPERTY_AWAITING_MANAGER_SUBMISSION_LABEL,
    ADMIN_PROPERTY_STATUS_FILTERS,
    ADMIN_PROPERTY_SORT_OPTIONS,
    filterAdminPropertyRegistry,
    filterVisibleAdminPropertyRegistry,
    buildAdminPropertyRegistryServiceFilters,
    getAdminPropertySortControlLabel,
    getAdminPropertyWorkflowFallbackLabel,
    isInternalAutomationProperty,
    isAdminPropertyAwaitingManagerSubmission,
    sortAdminPropertyRegistry,
} from './adminPropertyRegistry';

test('admin registry maps every sort option to backend ordering before pagination', () => {
    assert.deepEqual(buildAdminPropertyRegistryServiceSort('newest'), { field: 'createdAt', order: 'desc' });
    assert.deepEqual(buildAdminPropertyRegistryServiceSort('oldest'), { field: 'createdAt', order: 'asc' });
    assert.deepEqual(buildAdminPropertyRegistryServiceSort('title_asc'), { field: 'title', order: 'asc' });
    assert.deepEqual(buildAdminPropertyRegistryServiceSort('price_desc'), { field: 'price', order: 'desc' });
    assert.deepEqual(buildAdminPropertyRegistryServiceSort('status'), { field: 'status', order: 'asc' });
});

test('admin registry keeps broad search client-side and sends compatible filters to the backend', () => {
    assert.deepEqual(buildAdminPropertyRegistryServiceFilters({
        searchQuery: '  Gurgaon  ',
        typeFilter: 'sale',
        statusFilter: 'available',
    }), {
        search: 'Gurgaon',
        listingType: ['sale'],
        status: ['available', 'published', 'online', 'active'],
    });

    assert.deepEqual(buildAdminPropertyRegistryServiceFilters({
        typeFilter: 'commercial',
        statusFilter: 'all',
    }), {
        propertyType: ['commercial'],
    });
});

const testDir = path.dirname(fileURLToPath(import.meta.url));
const adminPropertiesPageSource = readFileSync(path.resolve(testDir, '../pages/admin/properties/page.tsx'), 'utf8');

const properties = [
    {
        id: 'available-sale',
        title: 'Live sale flat',
        city: 'London',
        listingType: 'sale',
        propertyType: 'apartment',
        status: 'published',
        contactName: 'Alex Admin',
        createdAt: '2026-04-22T10:00:00Z',
        updatedAt: '2026-04-22T10:00:00Z',
        price: { amount: 650000 },
    },
    {
        id: 'available-rent',
        title: 'Live rental studio',
        city: 'Edinburgh',
        listingType: 'rent',
        propertyType: 'apartment',
        status: 'available',
        contactName: 'Morgan Manager',
        createdAt: '2026-04-20T10:00:00Z',
        price: { amount: 1800 },
    },
    {
        id: 'draft-rent',
        title: 'Draft rental house',
        city: 'Manchester',
        listingType: 'rent',
        propertyType: 'house',
        status: 'draft',
        contactName: 'Dana Draft',
        createdAt: '2026-04-21T10:00:00Z',
        price: { amount: 2200 },
    },
    {
        id: 'sold-sale',
        title: 'Sold sale house',
        city: 'Bristol',
        listingType: 'sale',
        propertyType: 'house',
        status: 'sold',
        contactName: 'Sam Seller',
        createdAt: '2026-04-19T10:00:00Z',
        updatedAt: '2026-04-30T10:00:00Z',
        price: { amount: 725000 },
    },
    {
        id: 'pending-commercial',
        title: 'Pending office',
        city: 'Leeds',
        listingType: 'lease',
        propertyType: 'commercial',
        status: 'pending_approval',
        contactName: 'Case Reviewer',
        createdAt: '2026-04-18T10:00:00Z',
        price: { amount: 1250000 },
    },
];

test('admin property registry exposes visible status filter options', () => {
    assert.deepEqual(
        ADMIN_PROPERTY_STATUS_FILTERS.map((filter) => filter.label),
        ['All Statuses', 'Available', 'Draft', 'Pending', 'Sold', 'Rented', 'Suspended', 'Rejected', 'Off Market', 'Coming Soon'],
    );
});

test('admin property registry filters by status groups shown on property cards', () => {
    assert.deepEqual(
        filterAdminPropertyRegistry(properties, { typeFilter: 'all', statusFilter: 'available', searchQuery: '' })
            .map((property) => property.id),
        ['available-sale', 'available-rent'],
    );

    assert.deepEqual(
        filterAdminPropertyRegistry(properties, { typeFilter: 'all', statusFilter: 'draft', searchQuery: '' })
            .map((property) => property.id),
        ['draft-rent'],
    );

    assert.deepEqual(
        filterAdminPropertyRegistry(properties, { typeFilter: 'all', statusFilter: 'sold', searchQuery: '' })
            .map((property) => property.id),
        ['sold-sale'],
    );
});

test('admin property registry combines type status and search filters', () => {
    assert.deepEqual(
        filterAdminPropertyRegistry(properties, { typeFilter: 'sale', statusFilter: 'available', searchQuery: 'live' })
            .map((property) => property.id),
        ['available-sale'],
    );

    assert.deepEqual(
        filterAdminPropertyRegistry(properties, { typeFilter: 'commercial', statusFilter: 'pending', searchQuery: 'office' })
            .map((property) => property.id),
        ['pending-commercial'],
    );
});

test('admin property registry search can recover a notification-linked property by id', () => {
    assert.deepEqual(
        filterAdminPropertyRegistry(properties, {
            typeFilter: 'all',
            statusFilter: 'all',
            searchQuery: 'available-sale',
        }).map((property) => property.id),
        ['available-sale'],
    );
});

test('admin property registry sorts filtered rows for release QA combinations', () => {
    const filtered = filterAdminPropertyRegistry(properties, {
        typeFilter: 'sale',
        statusFilter: 'all',
        searchQuery: 'sale',
    });

    assert.deepEqual(sortAdminPropertyRegistry(filtered, 'price_desc').map((property) => property.id), [
        'sold-sale',
        'available-sale',
    ]);
    assert.deepEqual(sortAdminPropertyRegistry(filtered, 'newest').map((property) => property.id), [
        'available-sale',
        'sold-sale',
    ]);
    assert.deepEqual(sortAdminPropertyRegistry(filtered, 'oldest').map((property) => property.id), [
        'sold-sale',
        'available-sale',
    ]);
});

test('admin properties page exposes visible sort and first-last pagination controls', () => {
    assert.equal(getAdminPropertySortControlLabel(), 'Sort properties');
    assert.deepEqual(
        ADMIN_PROPERTY_SORT_OPTIONS.map((option) => option.label),
        ['Newest first', 'Oldest first', 'Title A-Z', 'Highest price', 'Status'],
    );
    assert.match(adminPropertiesPageSource, /PaginationBar/);
    assert.match(adminPropertiesPageSource, /getAdminPropertySortControlLabel/);
    assert.match(adminPropertiesPageSource, /useSearchParams/);
});

test('admin properties page keeps pagination available when a page has no visible cards', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'src/pages/admin/properties/page.tsx'), 'utf8');

    assert.match(source, /visibleTotalPages > 1/);
    assert.match(source, /No Properties Found[\s\S]*?<PaginationBar/);
    const emptyStateSource = source.slice(source.indexOf('No Properties Found'));
    assert.doesNotMatch(emptyStateSource, /currentItemCount=\{properties\.length\}/);
    assert.doesNotMatch(emptyStateSource, /totalItems=\{pagination\.total\}/);
});

test('admin properties page trusts server filters and clamps stale pages after mutations', () => {
    assert.match(adminPropertiesPageSource, /filterAdminPropertyRegistry\(properties/);
    assert.match(adminPropertiesPageSource, /pagination\.page > visibleTotalPages/);
    assert.match(adminPropertiesPageSource, /setPage\(visibleTotalPages\)/);
    assert.match(adminPropertiesPageSource, /const fetchPropertiesRef = useRef\(fetchProperties\)/);
    assert.match(adminPropertiesPageSource, /fetchPropertiesRef\.current = fetchProperties/);
    assert.match(adminPropertiesPageSource, /await fetchPropertiesRef\.current\(\)/);
    assert.doesNotMatch(adminPropertiesPageSource, /await fetchProperties\(\)/);
    assert.match(adminPropertiesPageSource, /const handleSearchChange = \(value: string\) => \{\s*setPage\(1\);\s*setSearchQuery\(value\)/);
    assert.match(adminPropertiesPageSource, /\}\), \[filteringType, searchQuery, statusFilter\]\);/);
});

test('admin layout keeps property registry filtering and pagination server-side', () => {
    const contextSource = readFileSync(path.resolve(process.cwd(), 'src/contexts/PropertyContext.tsx'), 'utf8');

    assert.match(contextSource, /page: pagination\.page/);
    assert.match(contextSource, /await propertyService\.getAdminProperties\(query\)/);
    assert.doesNotMatch(contextSource, /loadAllAdminPropertyPages/);
});

test('admin property workflow only shows awaiting manager submission for empty drafts', () => {
    assert.equal(
        getAdminPropertyWorkflowFallbackLabel({
            id: 'empty-draft',
            status: 'draft',
        }),
        ADMIN_PROPERTY_AWAITING_MANAGER_SUBMISSION_LABEL,
    );

    assert.equal(isAdminPropertyAwaitingManagerSubmission(properties[2]), false);
    assert.equal(getAdminPropertyWorkflowFallbackLabel(properties[2]), 'Draft');
});

test('admin property workflow treats populated service-shaped drafts as submitted content', () => {
    const populatedServiceDraft = {
        id: 'service-draft',
        title: 'Populated draft from backend',
        city: 'Chennai',
        listing_type: 'rent',
        property_type: 'apartment',
        status: 'draft',
        price: 650000,
        bedrooms: 2,
        bathrooms: 2,
        agent_name: 'Launch Manager',
    };

    assert.equal(isAdminPropertyAwaitingManagerSubmission(populatedServiceDraft), false);
    assert.equal(getAdminPropertyWorkflowFallbackLabel(populatedServiceDraft), 'Draft');
});

test('admin property registry keeps all persisted rows manageable while identifying automation fixtures', () => {
    const mixedProperties = [
        ...properties,
        {
            id: 'qa-manual-ft-e2e',
            title: 'QA Manual FT E2E 2026-06-25T18-30-15-991Z',
            city: 'Chennai',
            listingType: 'rent',
            propertyType: 'apartment',
            status: 'rented',
            contactName: 'Estospaces QA',
            price: { amount: 35000 },
        },
        {
            id: 'codex-qa-sale',
            title: 'Codex QA Sale Offer Manager 20260617152655',
            city: 'London',
            listingType: 'sale',
            propertyType: 'house',
            status: 'sold',
            contactName: 'Property Manager',
            price: { amount: 125000 },
        },
        {
            id: 'real-preston-home',
            title: 'Luxurious 3BHK in Preston',
            city: 'Preston',
            listingType: 'sale',
            propertyType: 'house',
            status: 'published',
            contactName: 'Jeevi Groups',
            price: { amount: 650000 },
        },
        {
            id: 'real-valley-home',
            title: 'Riverside family home',
            city: 'Test Valley',
            address_line_1: '14 Test Road',
            listingType: 'sale',
            propertyType: 'house',
            status: 'published',
            contactName: 'Jeevi Groups',
            price: { amount: 720000 },
        },
    ];

    assert.equal(isInternalAutomationProperty(mixedProperties[5]), true);
    assert.equal(isInternalAutomationProperty(mixedProperties[6]), true);
    assert.equal(isInternalAutomationProperty(mixedProperties[7]), false);
    assert.equal(isInternalAutomationProperty(mixedProperties[8]), false);
    assert.deepEqual(
        filterVisibleAdminPropertyRegistry(mixedProperties).map((property) => property.id),
        [...properties.map((property) => property.id), 'real-preston-home', 'real-valley-home'],
    );
    assert.deepEqual(
        filterAdminPropertyRegistry(mixedProperties, {
            typeFilter: 'all',
            statusFilter: 'all',
            searchQuery: 'Test Valley',
        }).map((property) => property.id),
        ['real-valley-home'],
    );
    assert.equal(filterAdminPropertyRegistry(mixedProperties, {
        typeFilter: 'all',
        statusFilter: 'all',
        searchQuery: '',
    }).length, mixedProperties.length);
});

test('admin property registry preserves distinct listings that share a title', () => {
    const sameTitleListings = [
        {
            id: 'listing-one',
            title: '2 BHK Apartment',
            city: 'Chennai',
            address_line_1: '1 Marina Road',
            agent_name: 'Marina Estates',
            price: 45000,
        },
        {
            id: 'listing-two',
            title: '2 BHK Apartment',
            city: 'Mumbai',
            address_line_1: '2 Harbour Road',
            agent_name: 'Harbour Estates',
            price: 55000,
        },
    ];

    assert.deepEqual(
        filterVisibleAdminPropertyRegistry(sameTitleListings).map((property) => property.id),
        ['listing-one', 'listing-two'],
    );
});
