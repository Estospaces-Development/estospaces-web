import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterContextProperties,
  type Property,
  type PropertyFilters,
} from './PropertyContext';

const property = (overrides: Partial<Property>): Property => ({
  id: 'property-base',
  title: 'Base property',
  description: 'Base description',
  propertyType: 'apartment',
  listingType: 'rent',
  status: 'available',
  price: { amount: 32000, currency: 'INR', negotiable: false },
  location: {
    addressLine1: 'Base Street',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postalCode: '600001',
    country: 'India',
  },
  rooms: { bedrooms: 2, bathrooms: 2 },
  dimensions: { totalArea: 1100, areaUnit: 'sqft' },
  furnishing: 'semi_furnished',
  amenities: {
    interior: [],
    exterior: [],
    community: [],
    security: [],
    utilities: [],
  },
  availableFrom: '2026-07-03',
  analytics: { views: 0, inquiries: 0, favorites: 0, shares: 0 },
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
  published: true,
  draft: false,
  ...overrides,
});

test('property context filters manager properties by search text', () => {
  const properties = [
    property({
      id: 'persist-proof',
      title: 'Issue209 Persist Proof 20260701213805',
      location: { addressLine1: 'QA Persist Street', city: 'Chennai' },
    }),
    property({
      id: 'address-match',
      title: 'QA Address Match 20260701200737',
      location: { addressLine1: 'Attur', city: 'Salem' },
    }),
  ];

  const filtered = filterContextProperties(properties, { search: 'address match' });

  assert.deepEqual(filtered.map((item) => item.id), ['address-match']);
});

test('property context combines search with status and price filters', () => {
  const properties = [
    property({
      id: 'available-rent',
      title: 'QA Dashboard Rental',
      status: 'available',
      price: { amount: 45000, currency: 'INR', negotiable: false },
    }),
    property({
      id: 'rented-rent',
      title: 'QA Dashboard Rental',
      status: 'rented',
      price: { amount: 35000, currency: 'INR', negotiable: false },
    }),
  ];
  const filters: PropertyFilters = {
    search: 'dashboard',
    status: ['available'],
    priceMin: 40000,
  };

  const filtered = filterContextProperties(properties, filters);

  assert.deepEqual(filtered.map((item) => item.id), ['available-rent']);
});
