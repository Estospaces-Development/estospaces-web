import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const adminPropertiesPage = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/properties/page.tsx'),
  'utf8',
);
const adminPropertyDetailPage = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/properties/[id]/page.tsx'),
  'utf8',
);

test('admin property cards keep actions separate from the card container', () => {
  assert.doesNotMatch(adminPropertiesPage, /role="button"[\s\S]*?renderWorkflowActions\(property\)/);
  assert.match(adminPropertiesPage, /aria-label=\{`Delete \$\{property\.title \|\| 'property'\}`\}/);
});

test('admin property registry exposes search and active filter state', () => {
  assert.match(adminPropertiesPage, /aria-label="Search property registry"/);
  assert.match(adminPropertiesPage, /aria-pressed=\{filteringType === type\.value\}/);
  assert.match(adminPropertiesPage, /aria-pressed=\{statusFilter === status\.value\}/);
});

test('admin property rejection uses an in-app reason dialog instead of native prompt', () => {
  assert.doesNotMatch(adminPropertiesPage, /window\.prompt/);
  assert.match(adminPropertiesPage, /role="dialog"/);
  assert.match(adminPropertiesPage, /aria-label="Reject property reason"/);
  assert.match(adminPropertiesPage, /A rejection reason is required to reject a property\./);
  assert.match(adminPropertiesPage, /bg-red-700[\s\S]{0,160}text-white/);
  assert.doesNotMatch(adminPropertiesPage, /bg-red-500[\s\S]{0,160}text-white/);
});

test('admin property destructive actions use in-app dialogs instead of native confirms', () => {
  assert.doesNotMatch(adminPropertiesPage, /window\.confirm/);
  assert.doesNotMatch(adminPropertyDetailPage, /window\.(prompt|confirm)/);
  assert.match(adminPropertiesPage, /aria-label="Delete property confirmation"/);
  assert.match(adminPropertyDetailPage, /aria-label="Delete property confirmation"/);
  assert.match(adminPropertyDetailPage, /aria-label="Reject property reason"/);
});
