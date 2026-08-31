import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDiscoverPath,
  buildDiscoverSearchParams,
  consumeDiscoverReturnHistoryState,
  isDiscoverReturnHistoryState,
  markDiscoverReturnHistoryState,
  readDiscoverViewMode,
  resolveDiscoverPage,
  selectDiscoverSearchSource,
} from './discoverSearchState';

test('discover return state preserves every user-controlled search option', () => {
  const params = buildDiscoverSearchParams({
    query: 'PR15QH',
    location: 'Preston',
    status: 'published',
    propertyType: 'house',
    minPrice: '100000',
    maxPrice: '500000',
    bedrooms: '3',
    bathrooms: '2',
    dashboardFilter: 'recently_added',
    sortBy: 'newest',
    listingTab: 'rent',
    viewMode: 'map',
    page: 3,
  });

  assert.deepEqual(Object.fromEntries(params), {
    q: 'PR15QH',
    location: 'Preston',
    status: 'published',
    propertyType: 'house',
    minPrice: '100000',
    maxPrice: '500000',
    beds: '3',
    baths: '2',
    filter: 'recently_added',
    sort: 'newest',
    type: 'rent',
    view: 'map',
    page: '3',
  });
  assert.equal(readDiscoverViewMode(params), 'map');
});

test('discover return state omits defaults and rejects unsupported view values', () => {
  const params = buildDiscoverSearchParams({
    query: '',
    location: '',
    status: '',
    propertyType: 'all',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    dashboardFilter: '',
    sortBy: 'relevance',
    listingTab: 'all',
    viewMode: 'grid',
    page: 1,
  });

  assert.equal(params.toString(), '');
  assert.equal(readDiscoverViewMode(new URLSearchParams('view=street')), 'grid');
});

test('explicit Discover URLs override a stale cached search', () => {
  assert.deepEqual(
    selectDiscoverSearchSource('q=Chennai&type=buy', '?q=PR15QH&type=rent&view=map', false),
    {
      search: 'q=Chennai&type=buy',
      useCachedSearch: false,
      discardCachedSearch: true,
    },
  );
});

test('a fresh unfiltered Discover visit discards an interrupted cached search', () => {
  assert.deepEqual(
    selectDiscoverSearchSource('', '?q=PR15QH&type=rent&view=map', false),
    {
      search: '',
      useCachedSearch: false,
      discardCachedSearch: true,
    },
  );
});

test('native Back can restore a matching cached Discover view', () => {
  assert.deepEqual(
    selectDiscoverSearchSource(
      'q=PR15QH&type=rent&view=map',
      '?q=PR15QH&type=rent&view=map',
      true,
    ),
    {
      search: 'q=PR15QH&type=rent&view=map',
      useCachedSearch: true,
      discardCachedSearch: false,
    },
  );
});

test('a fresh same-URL visit cannot consume a cached return entry', () => {
  assert.deepEqual(
    selectDiscoverSearchSource(
      'q=PR15QH&type=rent&view=map',
      '?q=PR15QH&type=rent&view=map',
      false,
    ),
    {
      search: 'q=PR15QH&type=rent&view=map',
      useCachedSearch: false,
      discardCachedSearch: true,
    },
  );
});

test('return history provenance is one-time and preserves router state', () => {
  const marked = markDiscoverReturnHistoryState({ key: 'router-key', idx: 3 });
  assert.equal(isDiscoverReturnHistoryState(marked), true);
  assert.deepEqual(consumeDiscoverReturnHistoryState(marked), {
    key: 'router-key',
    idx: 3,
  });

  const routerEnvelope = {
    key: 'next-route',
    usr: markDiscoverReturnHistoryState(null),
  };
  assert.equal(isDiscoverReturnHistoryState(routerEnvelope), true);
  assert.deepEqual(consumeDiscoverReturnHistoryState(routerEnvelope), {
    key: 'next-route',
    usr: {},
  });
});

test('native Back restores an unfiltered Discover entry when provenance matches', () => {
  assert.deepEqual(selectDiscoverSearchSource('', '', true), {
    search: '',
    useCachedSearch: true,
    discardCachedSearch: false,
  });
});

test('a listing filter cannot leave Discover on a page beyond the filtered results', () => {
  assert.equal(resolveDiscoverPage(2, 10, 12), 1);
  assert.equal(resolveDiscoverPage(2, 14, 12), 2);
  assert.equal(resolveDiscoverPage(4, 0, 12), 1);
});

test('clearing Discover search produces a route without the stale query', () => {
  assert.equal(buildDiscoverPath('/user/dashboard/discover', ''), '/user/dashboard/discover');
  assert.equal(
    buildDiscoverPath('/user/dashboard/discover', '?type=rent&q=PR15QH'),
    '/user/dashboard/discover?type=rent&q=PR15QH',
  );
});
