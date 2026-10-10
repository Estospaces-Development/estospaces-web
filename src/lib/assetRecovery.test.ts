import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../../public/asset-recovery-v1.js', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

const boot = () => {
    const store = new Map<string, string>();
    let handler: ((event: { target: unknown }) => void) | undefined;
    let capture: unknown;
    let reloads = 0;
    const window = {
        __estospacesBooted: false,
        sessionStorage: {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => void store.set(key, value),
        },
        location: { reload: () => { reloads += 1; } },
        addEventListener: (_type: string, listener: typeof handler, useCapture: unknown) => { handler = listener; capture = useCapture; },
    };
    vm.runInNewContext(script, { window });
    return {
        window,
        store,
        capture: () => capture,
        fail: (tagName: string, url: string) => handler?.({ target: tagName === 'LINK' ? { tagName, href: url } : { tagName, src: url } }),
        reloads: () => reloads,
    };
};

test('asset recovery listens in the capture phase, since resource errors do not bubble', () => {
    assert.equal(boot().capture(), true);
});

test('a missing stylesheet or modulepreload link also triggers the single reload', () => {
    const page = boot();
    page.fail('LINK', 'https://app.estospaces.com/assets/index-new.css');
    assert.equal(page.reloads(), 1);
});

test('asset recovery does nothing when session storage is unavailable', () => {
    const page = boot();
    page.window.sessionStorage.getItem = () => { throw new Error('blocked'); };
    page.fail('SCRIPT', 'https://app.estospaces.com/assets/index-new.js');
    assert.equal(page.reloads(), 0);
});

test('a build asset that fails before boot reloads the page once (deploy asset mismatch)', () => {
    const page = boot();
    page.fail('SCRIPT', 'https://app.estospaces.com/assets/index-new.js');
    page.fail('SCRIPT', 'https://app.estospaces.com/assets/index-new.js');
    assert.equal(page.reloads(), 1);
});

test('asset recovery ignores non-asset errors and errors after the app booted', () => {
    const page = boot();
    page.fail('IMG', 'https://app.estospaces.com/assets/photo.png');
    page.fail('SCRIPT', 'https://checkout.razorpay.com/v1/checkout.js');
    page.window.__estospacesBooted = true;
    page.fail('SCRIPT', 'https://app.estospaces.com/assets/page-x.js');
    assert.equal(page.reloads(), 0);
});

test('index.html loads asset recovery before the app entry and main.tsx clears it on boot', () => {
    const recovery = indexHtml.indexOf('<script src="/asset-recovery-v1.js"></script>');
    assert.ok(recovery > -1 && recovery < indexHtml.indexOf('type="module"'));
    const main = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');
    assert.match(main, /__estospacesBooted = true/);
    assert.match(main, /removeItem\('estospaces:asset-reload'\)/);
});

test('lazy routes also recover when Vite cannot preload a missing route stylesheet', () => {
    const chunkReload = readFileSync(new URL('./chunkReload.ts', import.meta.url), 'utf8');
    assert.match(chunkReload, /'Unable to preload CSS',/);
});
