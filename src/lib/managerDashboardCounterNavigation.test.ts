import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');

const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('manager dashboard summary counters navigate to their workspaces', () => {
  const source = readSource('src/components/dashboard/WelcomeBanner.tsx');

  assert.match(source, /path:\s*'\/manager\/dashboard\/properties'/);
  assert.match(source, /path:\s*'\/manager\/leads'/);
  assert.match(source, /path:\s*'\/manager\/applications'/);
  assert.match(source, /onClick=\{\(\) => navigate\(item\.path\)\}/);
  assert.match(source, /aria-label=\{item\.ariaLabel\}/);
});

test('manager dashboard KPI counters expose destination actions', () => {
  const source = readSource('src/pages/manager/dashboard/page.tsx');

  assert.match(source, /title="Live Fast Track"[\s\S]*?onClick=\{\(\) => navigate\('\/manager\/fast-track'\)\}/);
  assert.match(source, /title="Active Listings"[\s\S]*?onClick=\{\(\) => navigate\(buildManagerActiveListingsPath\(\)\)\}/);
  assert.match(source, /title="Total Views"[\s\S]*?onClick=\{\(\) => navigate\('\/manager\/analytics#manager-analytics-views'\)\}/);
  assert.match(source, /title="Conversion Rate"[\s\S]*?onClick=\{\(\) => navigate\('\/manager\/analytics#manager-analytics-conversion'\)\}/);
});

test('manager analytics exposes and restores KPI deep-link anchors', () => {
  const source = readSource('src/pages/manager/analytics/page.tsx');

  assert.match(source, /anchorId: 'manager-analytics-views'/);
  assert.match(source, /anchorId: 'manager-analytics-conversion'/);
  assert.match(source, /document\.getElementById\(anchorId\)/);
  assert.match(source, /scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
});
