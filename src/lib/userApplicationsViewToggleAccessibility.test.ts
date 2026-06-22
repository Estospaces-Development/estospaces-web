import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const userApplicationsPage = readFileSync(
  resolve(process.cwd(), 'src/pages/user/applications/page.tsx'),
  'utf8',
);

test('user applications view toggle buttons expose accessible state', () => {
  assert.match(userApplicationsPage, /aria-label="Switch to grid view"/);
  assert.match(userApplicationsPage, /aria-pressed=\{viewMode === 'grid'\}/);
  assert.match(userApplicationsPage, /aria-label="Switch to list view"/);
  assert.match(userApplicationsPage, /aria-pressed=\{viewMode === 'list'\}/);
});
