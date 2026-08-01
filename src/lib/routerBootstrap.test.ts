import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mainSource = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');

test('BrowserRouter bootstrap does not mount data-router-only components', () => {
    assert.match(mainSource, /<BrowserRouter>/);
    assert.doesNotMatch(mainSource, /ScrollRestoration/);
});
