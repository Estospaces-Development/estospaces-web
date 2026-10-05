import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../globals.css', import.meta.url), 'utf8');

test('the darker grey text override applies only in light mode (web-app#565)', () => {
    assert.match(css, /:where\(html:not\(\.dark\)\) \.text-gray-400 \{\s*color: #4b5563;/);
    assert.match(css, /:where\(html:not\(\.dark\)\) \.text-gray-500 \{\s*color: #374151;/);
    assert.doesNotMatch(css, /^\s*\.text-gray-(400|500) \{/m);
});
