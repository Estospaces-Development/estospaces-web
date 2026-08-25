import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('route-edge pages keep secondary controls named and readable', () => {
  const verificationSection = readSource('src/components/dashboard/VerificationSection.tsx');
  const userSettings = readSource('src/pages/user/settings/page.tsx');
  const userProperty = readSource('src/pages/user/properties/[id]/page.tsx');
  const managerPropertyForm = readSource('src/pages/manager/dashboard/properties/add/page.tsx');
  const adminPropertyDetail = readSource('src/pages/admin/properties/[id]/page.tsx');

  assert.match(verificationSection, /text-green-700 dark:text-green-300/);
  assert.match(userSettings, /aria-label="Toggle in-app notifications"/);
  assert.match(userSettings, /aria-label="Toggle email alerts"/);
  assert.match(userSettings, /aria-label="Toggle onboarding complete"/);
  assert.match(userProperty, /bg-sky-700 text-white/);
  assert.match(userProperty, /bg-sky-700 px-4 py-3\.5/);
  assert.match(userProperty, /text-green-700 font-medium/);
  assert.match(managerPropertyForm, /border-primary bg-primary\/10 text-orange-800/);
  assert.match(managerPropertyForm, /text-xs text-yellow-800 dark:text-yellow-200/);
  assert.match(adminPropertyDetail, /bg-blue-700 px-3 py-1/);
  assert.match(adminPropertyDetail, /bg-amber-700 px-5 py-4/);
});

test('manager property detail does not count passive views and keeps mobile icon actions named', () => {
  const managerPropertyDetail = readSource('src/pages/manager/dashboard/properties/[id]/page.tsx');

  assert.doesNotMatch(managerPropertyDetail, /incrementViews\(id\);/);
  assert.doesNotMatch(managerPropertyDetail, /analytics:\s*\{\s*\.\.\.property\.analytics,/);
  assert.match(managerPropertyDetail, /aria-label=\{isFavorited \? 'Remove property from saved' : 'Save property'\}/);
  assert.match(managerPropertyDetail, /aria-label=\{canSharePublicly \? "Share property" : "Publish property before sharing"\}/);
  assert.match(managerPropertyDetail, /aria-label="Duplicate property"/);
  assert.match(managerPropertyDetail, /aria-label="Edit property"/);
  assert.match(managerPropertyDetail, /aria-label="Delete property"/);
});

test('manager property detail delete confirmation is a named modal dialog', () => {
  const managerPropertyDetail = readSource('src/pages/manager/dashboard/properties/[id]/page.tsx');

  assert.match(managerPropertyDetail, /role="dialog"/);
  assert.match(managerPropertyDetail, /aria-modal="true"/);
  assert.match(managerPropertyDetail, /aria-labelledby="delete-property-title"/);
  assert.match(managerPropertyDetail, /aria-describedby="delete-property-description"/);
  assert.match(managerPropertyDetail, /id="delete-property-title"/);
  assert.match(managerPropertyDetail, /id="delete-property-description"/);
  assert.match(managerPropertyDetail, /aria-label="Cancel property deletion"/);
  assert.match(managerPropertyDetail, /aria-label="Confirm property deletion"/);
});
