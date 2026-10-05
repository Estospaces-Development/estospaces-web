import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('My Properties stat boxes stack on phones so Value and Updated do not wrap mid-word (web-app#573)', () => {
    const source = readFileSync(new URL('../pages/user/dashboard/contracts/page.tsx', import.meta.url), 'utf8');
    assert.match(source, /className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" data-portfolio-card-stats/);
});
