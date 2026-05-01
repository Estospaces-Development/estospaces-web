import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    ADMIN_PROPERTY_STATUS_FILTERS,
    ADMIN_PROPERTY_SORT_OPTIONS,
    filterAdminPropertyRegistry,
    getAdminPropertySortControlLabel,
    sortAdminPropertyRegistry,
} from './adminPropertyRegistry';

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
});

test('admin properties page exposes visible sort and first-last pagination controls', () => {
    assert.equal(getAdminPropertySortControlLabel(), 'Sort properties');
    assert.deepEqual(
        ADMIN_PROPERTY_SORT_OPTIONS.map((option) => option.label),
        ['Newest first', 'Oldest first', 'Title A-Z', 'Highest price', 'Status'],
    );
    assert.match(adminPropertiesPageSource, /PaginationBar/);
    assert.match(adminPropertiesPageSource, /getAdminPropertySortControlLabel/);
});
