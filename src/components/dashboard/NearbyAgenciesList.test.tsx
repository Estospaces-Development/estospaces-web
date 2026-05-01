import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import NearbyAgenciesList, { NearbyBrokerCard } from './NearbyAgenciesList';

test('nearby broker rows contain long names and service areas without overflow-prone truncation', () => {
  const markup = renderToStaticMarkup(
    <NearbyBrokerCard
      broker={{
        id: 'broker-long-copy',
        name: 'VeryLongBrokerNameWithoutNaturalBreaksVeryLongBrokerNameWithoutNaturalBreaks',
        company_name: 'ExtremelyLongIndependentAgencyTradingNameWithoutSpacesOrBreakpoints',
        postcode: 'SW1A 1AA',
        service_areas: ['SW1A', 'WestminsterAndVictoriaLongServiceAreaWithoutSpaces'],
        rating: 4.9,
        review_count: 12,
        fast_track_eligible: true,
      }}
      index={0}
    />,
  );

  assert.match(markup, /break-words/);
  assert.doesNotMatch(markup, /<h4[^>]*\btruncate\b/);
  assert.doesNotMatch(markup, /<span[^>]*\btruncate\b/);
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
