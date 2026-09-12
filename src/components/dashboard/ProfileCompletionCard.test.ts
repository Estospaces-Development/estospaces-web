import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(import.meta.dirname, 'ProfileCompletionCard.tsx'), 'utf8');

test('profile reminder close control is visible and comfortably sized on touch screens', () => {
    assert.match(source, /p-3 pr-12/);
    assert.match(source, /h-8 w-8/);
    assert.match(source, /opacity-100[\s\S]*sm:opacity-0 sm:group-hover:opacity-100/);
    assert.match(source, /focus-visible:opacity-100/);
    assert.match(source, /<X size=\{14\} strokeWidth=\{2\.25\}/);
});
