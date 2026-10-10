import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHUNK_RELOAD_KEY, reloadOnceForMissingChunk } from './chunkReload';

const memoryStorage = () => {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => void values.set(key, value),
        removeItem: (key: string) => void values.delete(key),
    } as unknown as Storage;
};

// One fake window = one page load; the storage survives reloads like sessionStorage does.
const pageLoad = (storage: Storage, pathname = '/manager/dashboard') => {
    const page = {
        reloads: 0,
        sessionStorage: storage,
        location: { pathname, search: '', hash: '', reload: () => { page.reloads += 1; } } as unknown as Location,
    };
    return page;
};

test('a chunk missing after a deploy reloads once, even when both reporters fire', () => {
    const storage = memoryStorage();
    const first = pageLoad(storage);

    assert.equal(reloadOnceForMissingChunk(first), true);
    assert.equal(reloadOnceForMissingChunk(first), true);
    assert.equal(first.reloads, 1);
    assert.equal(storage.getItem(CHUNK_RELOAD_KEY), '/manager/dashboard');
});

test('a chunk still missing after that reload gives up instead of looping', () => {
    const storage = memoryStorage();
    reloadOnceForMissingChunk(pageLoad(storage));

    const second = pageLoad(storage);
    assert.equal(reloadOnceForMissingChunk(second), false);
    assert.equal(reloadOnceForMissingChunk(second), false);
    assert.equal(second.reloads, 0);
    assert.equal(storage.getItem(CHUNK_RELOAD_KEY), null);
});

test('a failure on another page still gets its own reload', () => {
    const storage = memoryStorage();
    reloadOnceForMissingChunk(pageLoad(storage, '/manager/dashboard'));

    const other = pageLoad(storage, '/manager/fast-track');
    assert.equal(reloadOnceForMissingChunk(other), true);
    assert.equal(other.reloads, 1);
});

test('without session storage it never reloads', () => {
    const page = pageLoad({
        getItem: () => { throw new Error('blocked'); },
    } as unknown as Storage);

    assert.equal(reloadOnceForMissingChunk(page), false);
    assert.equal(page.reloads, 0);
});

test('nested lazy() imports are covered through vite:preloadError', () => {
    const main = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');
    assert.match(main, /addEventListener\('vite:preloadError', \(\) => \{\s*reloadOnceForMissingChunk\(\);/);
});
