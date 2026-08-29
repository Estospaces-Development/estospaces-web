import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

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
