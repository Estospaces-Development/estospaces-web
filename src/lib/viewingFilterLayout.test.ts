import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('viewing filters retain intrinsic label width inside their horizontal scroll container', () => {
    const source = readFileSync('src/pages/user/dashboard/viewings/page.tsx', 'utf8');
    const button = source.match(/key=\{option\.value\}([\s\S]*?)>\s*\{option\.label\}/)?.[1] || '';
    assert.ok(button.includes('shrink-0'), 'Filter buttons must not shrink to the global 44px minimum');
    assert.ok(button.includes('whitespace-nowrap'), 'Each filter keeps its complete label');
    assert.ok(button.includes('aria-pressed={filter === option.value}'), 'The selected filter is exposed to assistive technology');
    assert.ok(source.includes('overflow-x-auto'), 'The filter strip remains scrollable on narrow screens');
});
