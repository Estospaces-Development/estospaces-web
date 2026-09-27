import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildGuestLoginNavigation,
    clearPendingGuestAction,
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

const propertyLocation = { pathname: '/user/properties/abc-1', search: '', hash: '' };
const returnWith = (nonce: string | null, location = propertyLocation) => ({
    ...location,
    state: { backTo: '/search?page=2', pendingActionNonce: nonce },
});
const anyAction = () => true;

test('a stored guest action runs exactly once when the handoff nonce and path match', () => {
    const storage = createStorage();
    const nonce = storePendingGuestAction(storage, { type: 'save', origin: 'property', propertyId: ' ABC-1 ' }, propertyLocation, 1_000);
    assert.ok(nonce);
    const matches = (action: Parameters<typeof isPendingGuestActionForProperty>[0]) => (
        action.origin === 'property' && isPendingGuestActionForProperty(action, 'abc-1')
    );

    const action = consumePendingGuestAction(storage, returnWith(nonce), matches, 2_000);
    assert.equal(action?.type, 'save');
    assert.equal(action?.propertyId, 'abc-1');
    assert.equal(action?.returnPath, '/user/properties/abc-1');
    assert.equal(consumePendingGuestAction(storage, returnWith(nonce), matches, 2_000), null);
});

test('each handoff gets a fresh random nonce', () => {
    const storage = createStorage();
    const first = storePendingGuestAction(storage, { type: 'save', origin: 'property', propertyId: 'abc-1' }, propertyLocation);
    const second = storePendingGuestAction(storage, { type: 'save', origin: 'property', propertyId: 'abc-1' }, propertyLocation);
    assert.ok(first && second);
    assert.notEqual(first, second);
    assert.equal(consumePendingGuestAction(storage, returnWith(first), anyAction), null, 'a superseded nonce no longer matches');
});

test('a mismatched or missing nonce does not run the action and clears it', () => {
    const storage = createStorage();
    storePendingGuestAction(storage, { type: 'save', origin: 'search', propertyId: 'abc-1' }, { pathname: '/search', search: '?page=2', hash: '' });
    assert.equal(consumePendingGuestAction(storage, { pathname: '/search', search: '?page=2', hash: '', state: null }, anyAction), null);
    assert.equal(storage.values.has(PENDING_GUEST_ACTION_STORAGE_KEY), false);

    storePendingGuestAction(storage, { type: 'save', origin: 'search', propertyId: 'abc-1' }, { pathname: '/search', search: '?page=2', hash: '' });
    assert.equal(consumePendingGuestAction(storage, {
        pathname: '/search', search: '?page=2', hash: '', state: { pendingActionNonce: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
    }, anyAction), null);
    assert.equal(storage.values.has(PENDING_GUEST_ACTION_STORAGE_KEY), false);
});

test('a matching nonce on a different path does not run the action', () => {
    const storage = createStorage();
    const nonce = storePendingGuestAction(storage, { type: 'save', origin: 'search', propertyId: 'abc-1' }, { pathname: '/search', search: '?page=2', hash: '' });
    assert.equal(consumePendingGuestAction(storage, {
        pathname: '/search', search: '?page=3', hash: '', state: { pendingActionNonce: nonce },
    }, anyAction), null);
    assert.equal(storage.values.has(PENDING_GUEST_ACTION_STORAGE_KEY), false);

    const detailNonce = storePendingGuestAction(storage, { type: 'save', origin: 'property', propertyId: 'abc-1' }, propertyLocation);
    assert.equal(consumePendingGuestAction(storage, returnWith(detailNonce, { pathname: '/user/properties/other', search: '', hash: '' }), anyAction), null);
});

test('the return path comparison ignores a trailing slash and hash only', () => {
    const storage = createStorage();
    const nonce = storePendingGuestAction(storage, { type: 'save', origin: 'property', propertyId: 'abc-1' }, { ...propertyLocation, hash: '#gallery' });
    assert.ok(consumePendingGuestAction(storage, returnWith(nonce, { pathname: '/user/properties/abc-1/', search: '', hash: '' }), anyAction));
});

test('expired, malformed and unknown-type actions are cleared and not returned', () => {
    const storage = createStorage();
    const nonce = storePendingGuestAction(storage, { type: 'save', origin: 'property', propertyId: 'abc-1' }, propertyLocation, 1_000);
    assert.equal(consumePendingGuestAction(storage, returnWith(nonce), anyAction, 1_000 + PENDING_GUEST_ACTION_TTL_MS + 1), null);
    assert.equal(storage.values.has(PENDING_GUEST_ACTION_STORAGE_KEY), false);

    storage.setItem(PENDING_GUEST_ACTION_STORAGE_KEY, '{not json');
    assert.equal(consumePendingGuestAction(storage, returnWith(nonce), anyAction), null);
    storage.setItem(PENDING_GUEST_ACTION_STORAGE_KEY, JSON.stringify({
        type: 'delete_account', origin: 'property', propertyId: 'abc-1', nonce, returnPath: '/user/properties/abc-1', createdAt: Date.now(),
    }));
    assert.equal(consumePendingGuestAction(storage, returnWith(nonce), anyAction), null);
    // Legacy entries without a nonce are never honoured.
    storage.setItem(PENDING_GUEST_ACTION_STORAGE_KEY, JSON.stringify({
        type: 'save', origin: 'property', propertyId: 'abc-1', createdAt: Date.now(),
    }));
    assert.equal(consumePendingGuestAction(storage, returnWith(nonce), anyAction), null);
    assert.equal(storage.values.has(PENDING_GUEST_ACTION_STORAGE_KEY), false);
});

test('storing for an unsafe return path stores nothing; clearPendingGuestAction removes an entry', () => {
    const storage = createStorage();
    assert.equal(storePendingGuestAction(storage, { type: 'save', origin: 'property', propertyId: 'abc-1' }, { pathname: '/..//evil', search: '', hash: '' }), null);
    assert.equal(storage.values.has(PENDING_GUEST_ACTION_STORAGE_KEY), false);

    storePendingGuestAction(storage, { type: 'save', origin: 'property', propertyId: 'abc-1' }, propertyLocation);
    clearPendingGuestAction(storage);
    assert.equal(storage.values.has(PENDING_GUEST_ACTION_STORAGE_KEY), false);
});

test('buildGuestLoginNavigation passes a validated return path, back target and nonce', () => {
    const navigation = buildGuestLoginNavigation({
        pathname: '/search',
        search: '?page=2&sort=price_asc',
        hash: '',
        state: { backTo: 'https://evil.example', backLabel: 'Back', pendingActionNonce: 'attacker-supplied-nonce-0000' },
    });
    assert.match(navigation.to, /^\/login\/?$/);
    assert.deepEqual(navigation.state, { from: { pathname: '/search', search: '?page=2&sort=price_asc', hash: '' } });

    const nonce = '01234567-89ab-4cde-8f01-23456789abcd';
    const propertyNavigation = buildGuestLoginNavigation({
        pathname: '/user/properties/abc-1',
        search: '',
        hash: '',
        state: { backTo: '/search?page=2', backLabel: 'Back to Search' },
    }, nonce);
    assert.deepEqual(propertyNavigation.state?.from.state, {
        backTo: '/search?page=2',
        backLabel: 'Back to Search',
        pendingActionNonce: nonce,
    });

    assert.deepEqual(buildGuestLoginNavigation({ pathname: '//evil.example', search: '', hash: '' }).state, undefined);
    assert.deepEqual(buildGuestLoginNavigation({ pathname: '/search/..//evil', search: '', hash: '' }).state, undefined);
});
