import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/components/dashboard/ManagerPropertyCard.tsx'), 'utf8');

test('manager property title and price stack on narrow mobile screens', () => {
    assert.match(source, /flex-col[^\"]*min-\[360px\]:flex-row/);
    assert.match(source, /line-clamp-2[^\"]*min-\[360px\]:line-clamp-none/);
});

test('manager property price remains readable without squeezing the title', () => {
    assert.match(source, /self-start[^\"]*min-\[360px\]:shrink-0/);
});
