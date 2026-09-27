import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildGuestLoginNavigation,
    consumePendingGuestAction,
    isPendingGuestActionForProperty,
    PENDING_GUEST_ACTION_STORAGE_KEY,
    PENDING_GUEST_ACTION_TTL_MS,
    storePendingGuestAction,
} from './pendingGuestAction';

const createStorage = () => {
    const values = new Map<string, string>();
    return {
        values,
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
        removeItem: (key: string) => { values.delete(key); },
    };
};

test('a stored guest action is consumed exactly once for the matching property', () => {
    const storage = createStorage();
    storePendingGuestAction(storage, { type: 'save', origin: 'property', propertyId: ' ABC-1 ' }, 1_000);
    const matches = (action: { origin: string; propertyId: string }) => (
        action.origin === 'property' && isPendingGuestActionForProperty(action as never, 'abc-1')
    );

    assert.deepEqual(consumePendingGuestAction(storage, matches, 2_000), {
        type: 'save',
        origin: 'property',
        propertyId: 'abc-1',
        createdAt: 1_000,
    });
    assert.equal(consumePendingGuestAction(storage, matches, 2_000), null);
});

test('a non-matching, expired or malformed guest action is cleared and not returned', () => {
    const storage = createStorage();
    storePendingGuestAction(storage, { type: 'fast_track', origin: 'property', propertyId: 'abc-1' }, 1_000);
    assert.equal(consumePendingGuestAction(storage, (action) => action.propertyId === 'other', 2_000), null);
    assert.equal(storage.values.has(PENDING_GUEST_ACTION_STORAGE_KEY), false);

    storePendingGuestAction(storage, { type: 'save', origin: 'search', propertyId: 'abc-1' }, 1_000);
    assert.equal(consumePendingGuestAction(storage, () => true, 1_000 + PENDING_GUEST_ACTION_TTL_MS + 1), null);
    assert.equal(storage.values.has(PENDING_GUEST_ACTION_STORAGE_KEY), false);

    storage.setItem(PENDING_GUEST_ACTION_STORAGE_KEY, '{not json');
    assert.equal(consumePendingGuestAction(storage, () => true), null);
    storage.setItem(PENDING_GUEST_ACTION_STORAGE_KEY, JSON.stringify({ type: 'delete_account', origin: 'property', propertyId: 'abc-1', createdAt: Date.now() }));
    assert.equal(consumePendingGuestAction(storage, () => true), null);
    assert.equal(storage.values.has(PENDING_GUEST_ACTION_STORAGE_KEY), false);
});

test('buildGuestLoginNavigation passes a validated internal return path and back target', () => {
    const navigation = buildGuestLoginNavigation({
        pathname: '/search',
        search: '?page=2&sort=price_asc',
        hash: '',
        state: { backTo: 'https://evil.example', backLabel: 'Back' },
    });
    assert.match(navigation.to, /^\/login\/?$/);
    assert.deepEqual(navigation.state, { from: { pathname: '/search', search: '?page=2&sort=price_asc', hash: '' } });

    const propertyNavigation = buildGuestLoginNavigation({
        pathname: '/user/properties/abc-1',
        search: '',
        hash: '',
        state: { backTo: '/search?page=2', backLabel: 'Back to Search' },
    });
    assert.deepEqual(propertyNavigation.state?.from.state, { backTo: '/search?page=2', backLabel: 'Back to Search' });

    assert.deepEqual(buildGuestLoginNavigation({ pathname: '//evil.example', search: '', hash: '' }).state, undefined);
});
