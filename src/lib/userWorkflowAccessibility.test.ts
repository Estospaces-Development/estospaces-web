import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('user transaction surfaces keep compact status labels and destructive actions readable', () => {
  const applicationCard = readSource('src/components/dashboard/applications/ApplicationCard.tsx');
  const contracts = readSource('src/pages/user/dashboard/contracts/page.tsx');
  const reviews = readSource('src/pages/user/dashboard/reviews/page.tsx');
  const viewings = readSource('src/pages/user/dashboard/viewings/page.tsx');

  assert.match(applicationCard, /bg-emerald-50 text-emerald-700 dark:bg-emerald-900\/30 dark:text-emerald-300/);
  assert.match(contracts, /bg-yellow-50 text-yellow-800 border-yellow-200/);
  assert.match(reviews, /review.status === 'approved' \? 'bg-green-50 text-green-700'/);
  assert.match(reviews, /review.status === 'pending' \? 'bg-yellow-50 text-yellow-800'/);
  assert.match(viewings, /text-red-700 bg-red-50/);
});
