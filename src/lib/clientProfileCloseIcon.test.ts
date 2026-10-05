import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('client profile close icon is centred in its tap target and labelled (web-app#624)', () => {
    const source = readFileSync(new URL('../components/dashboard/ClientProfileModal.tsx', import.meta.url), 'utf8');
    assert.match(source, /aria-label="Close client profile"\s+className="absolute top-4 right-4 inline-flex items-center justify-center /);
});
