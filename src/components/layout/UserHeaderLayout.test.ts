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

test('user header keeps one centered app-search launcher between brand and account actions', () => {
  assert.match(headerSource, /grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(headerSource, /col-start-1 flex shrink-0 items-center/);
  assert.match(headerSource, /aria-label="Search Estospaces pages and activities"/);
  assert.match(headerSource, /aria-haspopup="dialog"/);
  assert.match(headerSource, /col-start-2 hidden[^\n]+justify-self-center/);
  assert.match(headerSource, /col-start-3 flex shrink-0 items-center[^\n]+justify-self-end[^\n]+aria-label="Account actions"/);
  assert.doesNotMatch(headerSource, /Center - Global Search/);
});

test('user header renders the official high-contrast brand mark at every viewport size', () => {
  assert.match(headerSource, /aria-label="Estospaces dashboard"/);
  assert.match(headerSource, /src="\/logo-icon\.png"/);
  assert.match(headerSource, /h-8 w-8 shrink-0 object-contain brightness-0 invert sm:h-9 sm:w-9/);
});
