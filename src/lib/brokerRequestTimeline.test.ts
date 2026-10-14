import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dedupeBrokerRequestsForTimeline,
  getBrokerRequestBudgetDisplayLabel,
  formatRequestedAtLabel,
  getBrokerRequestRequestedLabel,
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

test('#691: the timeline lists a new request next to an older matched request with the same brief', () => {
  const brief = { user_id: 'user-1', request_type: 'rent', location: 'Chennai', location_postcode: '600001', budget: '650000', details: 'Need a Chennai rental quickly' };
  const records = dedupeBrokerRequestsForTimeline([
    request({
      ...brief,
      id: 'older-matched',
      matched_broker_id: 'manager-1',
      handoff_status: 'portfolio_shared',
      property_shares: [{ id: 'share-1' } as never],
      updated_at: '2026-08-26T08:09:00Z',
    }),
    request({ ...brief, id: 'new-pending', status: 'submitted', dispatch_status: 'matching_wave_1', created_at: '2026-08-26T08:05:00Z', updated_at: '2026-08-26T08:05:00Z' }),
  ]);

  assert.deepEqual(records.map((record) => record.id), ['new-pending', 'older-matched']);
  assert.equal(records[0].property_shares?.length ?? 0, 0, 'the new request carries no shared homes from the older request');
});

test('timeline gives separate requests a precise submitted time instead of a shared update label', () => {
  assert.match(
    getBrokerRequestRequestedLabel(request({ created_at: '2026-08-26T08:00:05Z' })),
    /^Requested \d{1,2} [A-Z][a-z]{2}, \d{2}:\d{2}:\d{2}$/,
  );
  assert.equal(getBrokerRequestRequestedLabel(request({ created_at: 'invalid' })), 'Requested date unavailable');
});

test('timeline does not present invalid legacy purchase budgets as valid values', () => {
  assert.equal(getBrokerRequestBudgetDisplayLabel(request({ request_type: 'buy', budget: '500' })), 'Budget needs updating');
  assert.equal(getBrokerRequestBudgetDisplayLabel(request({ request_type: 'rent', budget: '2,650 pcm' })), 'Budget 2,650 pcm');
  assert.equal(getBrokerRequestBudgetDisplayLabel(request({ request_type: 'buy', budget: '' })), 'Budget unavailable');
});

test('a bare-number budget is shown in the currency its postcode or PIN code identifies', () => {
  assert.equal(getBrokerRequestBudgetDisplayLabel(request({ request_type: 'buy', budget: '730000', location: '600001' })), 'Budget ₹7,30,000');
  assert.equal(getBrokerRequestBudgetDisplayLabel(request({ request_type: 'rent', budget: '2650', location: 'London', location_postcode: 'SW1A 1AA' })), 'Budget £2,650');
  // A city name alone doesn't identify the currency, so the number is left as written.
  assert.equal(getBrokerRequestBudgetDisplayLabel(request({ request_type: 'rent', budget: '2650', location: 'London' })), 'Budget 2650');
});

test('tracker request time is en-GB 24-hour, never a locale-dependent AM/PM string (QA B15)', () => {
  const label = formatRequestedAtLabel(new Date(2026, 9, 14, 23, 45, 2));
  assert.equal(label, 'Requested 14 Oct, 23:45:02');
  assert.doesNotMatch(label, /AM|PM/i);
  assert.equal(formatRequestedAtLabel(new Date('invalid')), 'Requested date unavailable');
});
