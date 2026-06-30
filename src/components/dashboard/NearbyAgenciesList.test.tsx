import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import NearbyAgenciesList, { NearbyBrokerCard } from './NearbyAgenciesList';
import {
  limitNearestAgenciesForDashboard,
  USER_DASHBOARD_NEAREST_AGENCY_LIMIT,
} from './BrokerRequestWidget';

test('nearby broker rows contain long names and service areas without overflow-prone truncation', () => {
  const markup = renderToStaticMarkup(
    <NearbyBrokerCard
      broker={{
        id: 'broker-long-copy',
        name: 'VeryLongBrokerNameWithoutNaturalBreaksVeryLongBrokerNameWithoutNaturalBreaks',
        company_name: 'ExtremelyLongIndependentAgencyTradingNameWithoutSpacesOrBreakpoints',
        postcode: '600001',
        service_areas: ['600001', 'ChennaiAndAdyarLongServiceAreaWithoutSpaces'],
        rating: 4.9,
        review_count: 12,
        distance_miles: 1,
        fast_track_eligible: true,
      }}
      index={0}
    />,
  );

  assert.match(markup, /break-words/);
  assert.match(markup, /1\.6 km away/);
  assert.doesNotMatch(markup, /<h4[^>]*\btruncate\b/);
  assert.doesNotMatch(markup, /<span[^>]*\btruncate\b/);
  assert.doesNotMatch(markup, /SW1A|Westminster|mi away/);
});

test('nearby agent search controls expose visible keyboard focus states', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <NearbyAgenciesList />
    </MemoryRouter>,
  );

  assert.match(markup, /focus-visible:ring-2/);
  assert.match(markup, /focus-visible:ring-orange-500/);
});

test('user dashboard nearest agency results are capped to the top five', () => {
  const brokers = Array.from({ length: 7 }, (_, index) => ({
    id: `broker-${index + 1}`,
    name: `Broker ${index + 1}`,
    company_name: 'Estospaces Launch Manager',
    postcode: '600001',
    service_areas: ['600001'],
    rating: 4,
    review_count: 1,
    distance_miles: index,
    fast_track_eligible: true,
  }));

  const visibleBrokers = limitNearestAgenciesForDashboard(brokers);

  assert.equal(visibleBrokers.length, USER_DASHBOARD_NEAREST_AGENCY_LIMIT);
  assert.deepEqual(visibleBrokers.map((broker) => broker.id), [
    'broker-1',
    'broker-2',
    'broker-3',
    'broker-4',
    'broker-5',
  ]);
});
