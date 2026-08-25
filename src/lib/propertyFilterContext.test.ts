import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/contexts/PropertyFilterContext.tsx'), 'utf8');

test('listing tab state follows URL changes without resetting direct user selection', () => {
    assert.match(source, /const searchParamSnapshot = searchParams\.toString\(\)/);
    assert.match(source, /const currentSearchParams = new URLSearchParams\(searchParamSnapshot\)/);
    assert.match(source, /setActiveTabState\(getInitialTab\(\)\);\s*\}, \[getInitialTab\]\)/);
    assert.doesNotMatch(source, /\[pathname, searchParams, getInitialTab, activeTab\]/);
});
