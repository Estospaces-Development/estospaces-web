import assert from 'node:assert/strict';
import test from 'node:test';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createDashboardMapLocationGate, syncDashboardMapLocation } from './dashboardMapLocation';

test('dashboard search updates the map anchor from the entered location', async () => {
  const updates: string[] = [];
  let cleared = false;

  const result = await syncDashboardMapLocation(
    ' 400001 ',
    async (value) => {
      updates.push(value);
      return { latitude: 18.9388, longitude: 72.8354 };
    },
    () => {
      cleared = true;
    },
  );

  assert.deepEqual(updates, ['400001']);
  assert.equal(cleared, false);
  assert.deepEqual(result, { latitude: 18.9388, longitude: 72.8354 });
});

test('clearing dashboard location restores the profile or device map anchor', async () => {
  let updateCalled = false;
  let cleared = false;

  const result = await syncDashboardMapLocation(
    '   ',
    async () => {
      updateCalled = true;
    },
    () => {
      cleared = true;
    },
  );

  assert.equal(result, null);
  assert.equal(updateCalled, false);
  assert.equal(cleared, true);
});

test('latest dashboard map lookup wins and clearing invalidates an in-flight lookup', () => {
  const gate = createDashboardMapLocationGate();
  const first = gate.begin();
  const second = gate.begin();

  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);

  gate.invalidate();
  assert.equal(gate.isCurrent(second), false);
});

test('dashboard synchronizes map location from URL changes as well as form submits', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/pages/user/dashboard/DashboardClient.tsx'), 'utf8');

  assert.match(source, /const dashboardLocationParam = \([\s\S]*hasDashboardSearchParams\(searchParams\)[\s\S]*initialDashboardSearchParams[\s\S]*\)\.get\('location'\) \|\| ''/);
  assert.match(source, /syncDashboardMapLocation\(\s*dashboardLocationParam,/);
});
