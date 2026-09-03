import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildDiscoverSearchPath,
    filterUserAppSearchDestinations,
    shouldOfferDiscoverSearch,
    shouldShowScopedListSearch,
    USER_DISCOVER_PATH,
} from './userAppSearch';

test('app search returns concise default destinations and matches user language', () => {
    assert.equal(filterUserAppSearchDestinations('').length, 6);
    assert.deepEqual(
        filterUserAppSearchDestinations('appointment').map((destination) => destination.label),
        ['Viewings'],
    );
    assert.deepEqual(
        filterUserAppSearchDestinations('document').map((destination) => destination.label),
        ['Fast Track', 'Virtual Storage'],
    );
});

test('property queries hand off to the canonical discover route', () => {
    assert.equal(USER_DISCOVER_PATH, '/user/dashboard/discover');
    assert.equal(buildDiscoverSearchPath(''), USER_DISCOVER_PATH);
    assert.equal(
        buildDiscoverSearchPath('Anna Nagar & Chennai'),
        '/user/dashboard/discover?q=Anna+Nagar+%26+Chennai',
    );
    assert.equal(shouldOfferDiscoverSearch('Chennai', []), true);
    assert.equal(
        shouldOfferDiscoverSearch('home', filterUserAppSearchDestinations('home')),
        true,
    );
    assert.equal(
        shouldOfferDiscoverSearch('messages', filterUserAppSearchDestinations('messages')),
        false,
    );
});

test('local list search appears only for useful list sizes or an active query', () => {
    assert.equal(shouldShowScopedListSearch(7, ''), false);
    assert.equal(shouldShowScopedListSearch(8, ''), true);
    assert.equal(shouldShowScopedListSearch(2, 'Chennai'), true);
});
