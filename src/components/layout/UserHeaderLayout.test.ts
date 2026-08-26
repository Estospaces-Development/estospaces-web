import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const headerSource = readFileSync(
  resolve(process.cwd(), 'src/components/layout/UserHeader.tsx'),
  'utf8',
);

test('user header centers its navigation content with balanced outer spacing', () => {
  const rowClasses = headerSource.match(
    /<header[^>]*>\s*<div className="([^"]+)"/,
  )?.[1];

  assert.ok(rowClasses, 'expected to find the user header content row');
  assert.match(rowClasses, /\bmx-auto\b/);
  assert.match(rowClasses, /\bw-full\b/);
  assert.match(rowClasses, /\bmax-w-7xl\b/);
});

test('user header search expands between the brand and account actions', () => {
  const searchClasses = headerSource.match(
    /\{\/\* Center - Global Search \*\/\}\s*<div className="([^"]+)"/,
  )?.[1];

  assert.ok(searchClasses, 'expected to find the global search wrapper');
  assert.match(searchClasses, /\bsm:flex-1\b/);
  assert.match(searchClasses, /\bmd:max-w-none\b/);
  assert.doesNotMatch(searchClasses, /\bmd:max-w-xl\b/);
});

test('user header renders the official high-contrast brand mark at every viewport size', () => {
  assert.match(headerSource, /aria-label="Estospaces dashboard"/);
  assert.match(headerSource, /src="\/logo-icon\.png"/);
  assert.match(headerSource, /h-8 w-8 shrink-0 object-contain brightness-0 invert sm:h-9 sm:w-9/);
});
