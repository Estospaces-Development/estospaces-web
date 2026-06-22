import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const managerPropertiesPage = readFileSync(
  resolve(process.cwd(), 'src/pages/manager/dashboard/properties/page.tsx'),
  'utf8',
);

test('manager properties toolbar gives icon-only buttons accessible names', () => {
  assert.match(managerPropertiesPage, /aria-label="Search manager properties"/);
  assert.match(managerPropertiesPage, /aria-label="Clear property search"/);
  assert.match(managerPropertiesPage, /aria-label="Sort properties"/);
  assert.match(managerPropertiesPage, /aria-label=\{`Switch to \$\{mode\} view`\}/);
  assert.match(managerPropertiesPage, /aria-pressed=\{viewMode === mode\}/);
  assert.match(managerPropertiesPage, /aria-label=\{`Share \$\{property\.title\}`\}/);
  assert.match(managerPropertiesPage, /aria-label=\{`Delete \$\{property\.title\}`\}/);
  assert.match(managerPropertiesPage, /aria-label=\{`Edit \$\{property\.title\}`\}/);
});

test('manager property delete actions use an in-app confirmation dialog', () => {
  assert.doesNotMatch(managerPropertiesPage, /window\.confirm/);
  assert.match(managerPropertiesPage, /const openDeleteDialog = \(property: Property\)/);
  assert.match(managerPropertiesPage, /aria-label="Delete property confirmation"/);
  assert.match(managerPropertiesPage, />Delete property</);
});

test('manager properties toolbar uses contrast-safe active inventory colors', () => {
  assert.match(managerPropertiesPage, /border-primary bg-primary\/10 text-orange-800/);
  assert.match(managerPropertiesPage, /bg-primary\/10 text-orange-800 dark:text-orange-100 font-medium/);
  assert.match(managerPropertiesPage, /text-gray-900 dark:text-gray-100/);
  assert.match(managerPropertiesPage, /text-emerald-700 dark:text-emerald-300/);
});
