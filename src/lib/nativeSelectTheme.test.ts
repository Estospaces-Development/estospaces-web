import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const globalStyles = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

test('ticket 402 keeps native dropdown options readable in light and dark themes', () => {
    assert.match(globalStyles, /select option,[\s\S]*?select optgroup\s*\{[\s\S]*?background-color:\s*#ffffff;[\s\S]*?color:\s*#111827;/);
    assert.match(globalStyles, /\.dark select option,[\s\S]*?\.dark select optgroup\s*\{[\s\S]*?background-color:\s*#111827;[\s\S]*?color:\s*#f9fafb;/);
    assert.match(globalStyles, /\.dark select\s*\{[\s\S]*?color-scheme:\s*dark;/);
});
