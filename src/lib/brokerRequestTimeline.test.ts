import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dedupeBrokerRequestsForTimeline,
  getBrokerRequestDisplayTitle,
  isUserVisibleBrokerRequest,
} from './brokerRequestTimeline';
import type { BrokerRequestRecord } from '@/services/leadsService';

const request = (overrides: Partial<BrokerRequestRecord> = {}): BrokerRequestRecord => ({
  id: 'request-1',
  user_id: 'user-1',
  request_type: 'buy',
  location: 'Chennai',
  status: 'matched',
  created_at: '2026-08-26T08:00:00Z',
  updated_at: '2026-08-26T08:00:00Z',
  ...overrides,
});

test('timeline hides internal QA records and does not derive a title from a mismatched location', () => {
  assert.equal(isUserVisibleBrokerRequest(request({
    selected_property: {
      id: 'property-1',
      title: 'QA Admin Notice Rental 20260702000323',
      address_line_1: '1 Test Street',
      city: 'Chennai',
      price: 100000,
      property_type: 'house',
    },
  })), false);
  assert.equal(getBrokerRequestDisplayTitle(request({ location: 'Preston', location_postcode: 'SW1A 1AA' })), 'Property agent request');
});

test('timeline collapses parallel duplicates but preserves a later separate journey', () => {
  const records = dedupeBrokerRequestsForTimeline([
    request({ id: 'older', selected_property_id: 'property-1' }),
    request({
      id: 'newer',
      selected_property_id: 'property-1',
      created_at: '2026-08-26T08:04:00Z',
      updated_at: '2026-08-26T08:04:00Z',
    }),
    request({
      id: 'later-journey',
      selected_property_id: 'property-1',
      selected_fast_track_case_id: 'case-later',
      created_at: '2026-08-26T09:00:00Z',
      updated_at: '2026-08-26T09:00:00Z',
    }),
    request({ id: 'different', selected_property_id: 'property-2' }),
  ]);

  assert.deepEqual(records.map((record) => record.id).sort(), ['different', 'later-journey', 'newer']);
});
