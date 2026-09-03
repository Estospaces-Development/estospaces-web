import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSavedSearchPageParams,
  buildSavedSearchRerunParams,
  getSavedSearchTargetPage,
} from '@/lib/savedSearchPagination';

test('manual saved-search pagination clears alert focus', () => {
  const params = buildSavedSearchPageParams(
    new URLSearchParams('tab=searches&searchesPage=2&alert=alert-12'),
    3,
  );

  assert.equal(params.get('searchesPage'), '3');
  assert.equal(params.get('alert'), null);
  assert.equal(params.get('tab'), 'searches');
});

test('alert deep links can navigate to their containing saved-search page', () => {
  const params = buildSavedSearchPageParams(
    new URLSearchParams('tab=searches&alert=alert-12'),
    2,
    { preserveAlert: true },
  );

  assert.equal(params.get('searchesPage'), '2');
  assert.equal(params.get('alert'), 'alert-12');
});

test('the first saved-search page omits the redundant page parameter', () => {
  const params = buildSavedSearchPageParams(
    new URLSearchParams('tab=searches&searchesPage=4'),
    1,
  );

  assert.equal(params.get('searchesPage'), null);
});

test('an alert deep link wins over a stale saved-search page number', () => {
  assert.equal(getSavedSearchTargetPage(99, 16, 11, 10), 2);
  assert.equal(getSavedSearchTargetPage(99, 16, -1, 10), 2);
});

test('rerunning a saved search preserves its market restriction', () => {
  const params = buildSavedSearchRerunParams({
    query: 'apartment',
    location: 'Chennai',
    country: 'IN',
    listing_type: 'sale',
    bedrooms: 2,
  });

  assert.equal(params.get('q'), 'apartment');
  assert.equal(params.get('location'), 'Chennai');
  assert.equal(params.get('market'), 'IN');
  assert.equal(params.get('type'), 'sale');
  assert.equal(params.get('beds'), '2');
});
