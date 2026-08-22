import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const dashboardSource = readFileSync(
  resolve(process.cwd(), 'src/pages/user/dashboard/DashboardClient.tsx'),
  'utf8',
);

test('dashboard hero heading block stays horizontally centered', () => {
  assert.match(
    dashboardSource,
    /className="mx-auto max-w-4xl text-center text-white"/,
  );
  assert.match(
    dashboardSource,
    /className="mt-4 text-balance text-4xl font-bold/,
  );
  assert.match(
    dashboardSource,
    /className="mx-auto mt-4 max-w-2xl text-pretty text-base/,
  );
});
