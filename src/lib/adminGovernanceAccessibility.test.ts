import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('enabled admin filters and registry search remain readable in dark mode', () => {
  const properties = readSource('src/pages/admin/properties/page.tsx');
  const users = readSource('src/pages/admin/users/page.tsx');
  assert.equal((properties.match(/text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/g) || []).length, 2);
  assert.equal(users.includes('border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'), true);
  const search = properties.slice(properties.indexOf('aria-label="Search property registry"'), properties.indexOf('aria-label="Search property registry"') + 850);
  assert.equal(search.includes('text-gray-900 dark:text-white'), true);
  assert.equal(search.includes('placeholder:text-gray-600 dark:placeholder:text-gray-300'), true);
});

test('admin governance surfaces keep compact badges and review actions readable', () => {
  const analytics = readSource('src/pages/admin/analytics/page.tsx');
  const properties = readSource('src/pages/admin/properties/page.tsx');
  const users = readSource('src/pages/admin/users/page.tsx');
  const reviews = readSource('src/pages/admin/reviews/page.tsx');

  assert.match(analytics, /text-green-700 bg-green-100/);
  assert.match(properties, /bg-blue-700 px-3 py-1/);
  assert.match(properties, /bg-blue-700 text-white shadow-lg shadow-blue-700\/20/);
  assert.match(properties, /bg-emerald-700 text-white shadow-lg shadow-emerald-700\/20/);
  assert.match(properties, /text-blue-700/);
  assert.match(properties, /bg-amber-700 px-4 py-3/);
  assert.match(users, /bg-emerald-700[^\"]*text-white/);
  assert.match(users, /bg-emerald-50 dark:bg-emerald-900\/20 text-emerald-700/);
  assert.match(users, /bg-red-50 text-red-700 hover:bg-red-100/);
  assert.match(reviews, /bg-yellow-100 text-yellow-800/);
  assert.match(reviews, /bg-green-700 px-4 py-2/);
  assert.match(reviews, /bg-red-50 px-4 py-2 text-sm font-bold text-red-700/);
});
