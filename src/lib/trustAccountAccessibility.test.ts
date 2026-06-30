import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('trust and account pages expose labels for switches and icon-only controls', () => {
  const toggle = readSource('src/components/ui/Toggle.tsx');
  const settings = readSource('src/pages/user/dashboard/settings/page.tsx');
  const adminAnalytics = readSource('src/pages/admin/analytics/page.tsx');

  assert.match(toggle, /role="switch"/);
  assert.match(toggle, /aria-label=\{ariaLabel\}/);
  assert.match(toggle, /aria-checked=\{checked\}/);
  assert.match(settings, /ariaLabel="Toggle in-app notifications"/);
  assert.match(settings, /ariaLabel="Toggle email alerts"/);
  assert.match(settings, /ariaLabel="Toggle onboarding complete"/);
  assert.match(adminAnalytics, /aria-label="Refresh analytics"/);
});

test('user account forms connect visible labels to editable inputs', () => {
  const profile = readSource('src/pages/user/dashboard/profile/page.tsx');
  const settings = readSource('src/pages/user/dashboard/settings/page.tsx');

  assert.match(profile, /htmlFor="user-full-name"/);
  assert.match(profile, /id="user-full-name"/);
  assert.match(profile, /htmlFor="user-phone-number"/);
  assert.match(profile, /id="user-phone-number"/);
  assert.match(profile, /htmlFor="user-postcode"/);
  assert.match(profile, /id="user-postcode"/);
  assert.match(profile, /htmlFor="user-residential-address"/);
  assert.match(profile, /id="user-residential-address"/);
  assert.match(settings, /aria-pressed=\{activeTab === tab\.id\}/);
});

test('scrollable tables and review star ratings are accessible', () => {
  const docsMarkdown = readSource('src/components/docs/DocsMarkdown.tsx');
  const managerAnalytics = readSource('src/pages/manager/analytics/page.tsx');
  const adminAnalytics = readSource('src/pages/admin/analytics/page.tsx');
  const reviews = readSource('src/pages/user/dashboard/reviews/page.tsx');
  const profile = readSource('src/pages/user/dashboard/profile/page.tsx');

  assert.match(docsMarkdown, /tabIndex=\{0\} aria-label="Scrollable documentation table"/);
  assert.match(managerAnalytics, /tabIndex=\{0\} aria-label="Scrollable property performance rankings table"/);
  assert.match(adminAnalytics, /tabIndex=\{0\} aria-label="Scrollable top performing paths table"/);
  assert.match(reviews, /role=\{interactive \? 'radiogroup' : 'img'\}/);
  assert.match(profile, /htmlFor="user-email-address"/);
  assert.match(profile, /id="user-email-address"/);
});
