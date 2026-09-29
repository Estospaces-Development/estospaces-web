import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/manager/dashboard/properties/page.tsx'), 'utf8');

test('manager property table gives mobile users a clear horizontal scroll affordance', () => {
    assert.match(source, /Swipe sideways to see status and actions/);
    assert.match(source, /aria-label="Scrollable property listings table"/);
    assert.match(source, /tabIndex=\{0\}/);
});

test('property search refetches never replace the page (and the search input) with the full loader', () => {
    assert.match(source, /shouldShowManagerPropertyInitialLoader\(\s*loading,\s*properties\.length,\s*pagination\.total,\s*inventorySettled,\s*\)/);
    assert.match(source, /setInventorySettled\(true\)/);
});
