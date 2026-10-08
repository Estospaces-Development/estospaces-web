import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPropertyLoadSequence,
  filterContextProperties,
  mapServicePropertyLocation,
  mapContextPropertyLocation,
  mapContextPropertyMedia,
  mapContextPropertyRooms,
  mapServicePropertyRooms,
  type Property,
  type PropertyFilters,
} from './PropertyContext';
import type { Property as ServiceProperty } from '../services/propertyService';

test('address detail fields survive form writes and list-to-edit reads', () => {
  const details = { state: 'Tamil Nadu', state_code: 'TN', neighborhood: 'Adyar', landmark: 'Near the library' };
  const source = {
    id: 'qa-address', title: 'QA address', property_type: 'apartment', listing_type: 'rent',
    status: 'draft', price: 25000, currency: 'INR', bedrooms: 2, bathrooms: 1,
    address_line_1: '2 QA Street', city: 'Chennai', postcode: '600020', country: 'India',
    latitude: 13.001127, longitude: 80.257313, ...details,
  } satisfies ServiceProperty;
  const location = mapServicePropertyLocation(source);
  assert.equal(location?.state, details.state);
  assert.equal(location?.stateCode, details.state_code);
  assert.equal(location?.neighborhood, details.neighborhood);
  assert.equal(location?.landmark, details.landmark);
  assert.deepEqual(mapContextPropertyLocation({ location }), {
    address_line_1: source.address_line_1, city: source.city, postcode: source.postcode,
    country: source.country, latitude: source.latitude, longitude: source.longitude, ...details,
  });
});

test('address detail patches distinguish omitted fields from explicit clearing', () => {
  assert.deepEqual(mapContextPropertyLocation({ title: 'Only change title' }), {});
  assert.deepEqual(mapContextPropertyLocation({ location: { landmark: 'A new landmark' } }), { landmark: 'A new landmark' });
  assert.deepEqual(mapContextPropertyLocation({ location: { state: '', stateCode: '', neighborhood: '', landmark: '' } }), {
    state: '', state_code: '', neighborhood: '', landmark: '',
  });
  assert.deepEqual(mapContextPropertyLocation({ location: { countryId: 'in', stateId: 'tn', cityId: 'chennai' } }), {});
});

test('list-to-edit location keeps the launch market and persisted pin together', () => {
  for (const [country, code, latitude, longitude] of [
    ['India', 'IN', '13.001127', '80.257313'],
    ['United Kingdom', 'GB', '51.501', '-0.142'],
    ['UK', 'GB', '51.501', '-0.142'],
  ]) {
    const source: ServiceProperty = {
      id: 'qa-draft', title: 'QA draft', property_type: 'apartment', listing_type: 'rent',
      status: 'draft', price: 25000, currency: code === 'IN' ? 'INR' : 'GBP',
      bedrooms: 2, bathrooms: 1, address_line_1: 'QA Street', city: 'QA City',
      postcode: code === 'IN' ? '600020' : 'SW1A 1AA', country, latitude, longitude,
    };
    const location = mapServicePropertyLocation(source);
    assert.equal(location?.countryCode, code);
    assert.equal(location?.latitude, Number(latitude));
    assert.equal(location?.longitude, Number(longitude));
    assert.equal(location?.country, country);
    assert.equal(mapServicePropertyLocation({ ...source, country: 'Unknown' })?.countryCode, undefined);
    assert.equal(mapServicePropertyLocation({ ...source, latitude: '' })?.latitude, undefined);
  }
});

test('property context ignores responses superseded by a newer request', () => {
  const sequence = createPropertyLoadSequence();
  const olderRequest = sequence.begin();
  const newerRequest = sequence.begin();

  assert.equal(sequence.isCurrent(olderRequest), false);
  assert.equal(sequence.isCurrent(newerRequest), true);
});

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

test('property context search keeps rows where each word matches a different field, like core', () => {
  const properties = [
    property({ id: 'villa', title: 'Luxurious 3BHK Villa', propertyType: 'apartment' }),
    property({ id: 'flat', title: 'Luxurious apartment' }),
    property({ id: 'other', title: 'Luxurious House', propertyType: 'house' }),
  ];

  assert.deepEqual(filterContextProperties(properties, { search: '  Luxurious   apartment ' }).map((item) => item.id), ['villa', 'flat']);
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

test('available manager filter keeps every backend live-status alias', () => {
  const properties = ['available', 'published', 'online', 'active', 'sold'].map((status) => property({
    id: status,
    status: status as Property['status'],
  }));

  const filtered = filterContextProperties(properties, { status: ['available'] });

  assert.deepEqual(filtered.map((item) => item.id), ['available', 'published', 'online', 'active']);
});

test('pending and rented manager filters keep the statuses core returns for them (MB-0199)', () => {
  const properties = ['pending_approval', 'pending', 'rented', 'let', 'draft', 'available'].map((status) => property({
    id: status,
    status: status as Property['status'],
  }));

  assert.deepEqual(filterContextProperties(properties, { status: ['pending'] }).map((item) => item.id), ['pending_approval', 'pending']);
  assert.deepEqual(filterContextProperties(properties, { status: ['rented'] }).map((item) => item.id), ['rented', 'let']);
  assert.deepEqual(filterContextProperties(properties, { status: ['let'] }).map((item) => item.id), ['rented', 'let']);
  assert.deepEqual(filterContextProperties(properties, { status: ['draft'] }).map((item) => item.id), ['draft']);
});

test('balconies survive the form write and the list-to-edit read (MB-0171)', () => {
  assert.deepEqual(mapContextPropertyRooms({ rooms: { bedrooms: 3, bathrooms: 2, balconies: 2, parkingSpaces: 1 } }), {
    balconies: 2,
    parking_spaces: 1,
  });
  assert.deepEqual(mapContextPropertyRooms({ rooms: { bedrooms: 0, bathrooms: 0, balconies: 0 } }), { balconies: 0 });
  assert.deepEqual(mapContextPropertyRooms({ title: 'Title-only edit' }), {});

  const source = {
    id: 'qa-balconies', title: 'QA balconies', property_type: 'apartment', listing_type: 'rent',
    status: 'draft', price: 1500, currency: 'GBP', bedrooms: 3, bathrooms: 2, balconies: 2, parking_spaces: 1,
    address_line_1: '1 Balcony Street', city: 'London', postcode: 'SW1A 1AA', country: 'UK',
  } satisfies ServiceProperty;
  assert.deepEqual(mapServicePropertyRooms(source), { bedrooms: 3, bathrooms: 2, balconies: 2, parkingSpaces: 1 });
  // Core before the balconies column omits the field: read it as 0.
  const { balconies: _omitted, ...legacy } = source;
  assert.equal(mapServicePropertyRooms(legacy).balconies, 0);
});

test("media updates always send present image and video lists, including empty ones", () => {
  assert.deepEqual(mapContextPropertyMedia({ images: [], videos: [] }), {
    image_urls: [],
    video_urls: [],
  });
  assert.deepEqual(
    mapContextPropertyMedia({
      images: ["https://media.example.test/a.jpg", new File(["x"], "pending.jpg")],
      videos: ["https://media.example.test/v.mp4"],
    }),
    {
      image_urls: ["https://media.example.test/a.jpg"],
      video_urls: ["https://media.example.test/v.mp4"],
    },
  );
  assert.deepEqual(mapContextPropertyMedia({ title: "Status-only edit" }), {});
});
