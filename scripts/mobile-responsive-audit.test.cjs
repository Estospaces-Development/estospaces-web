const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'mobile-responsive-audit.cjs'), 'utf8');

test('mobile audit covers every authenticated role and route family', () => {
  assert.match(source, /user: \[/);
  assert.match(source, /manager: \[/);
  assert.match(source, /admin: \[/);
  assert.match(source, /\/user\/dashboard\/fast-track/);
  assert.match(source, /\/user\/dashboard\/bookings/);
  assert.match(source, /\/manager\/dashboard\/properties\/add/);
  assert.match(source, /\/admin\/research/);
  assert.match(source, /resolveDynamicRoutes/);
  assert.match(source, /properties\/edit/);
});

test('mobile audit fails on real overflow, undersized touch targets, missing navigation, and runtime errors', () => {
  assert.match(source, /document overflows by/);
  assert.match(source, /touch targets are below 44px/);
  assert.match(source, /hasIntentionalHorizontalContainer/);
  assert.match(source, /isDecorativeOverflow/);
  assert.match(source, /mobile role navigation is not visible/);
  assert.match(source, /page errors/);
  assert.match(source, /console errors/);
  assert.match(source, /failed application requests/);
  assert.match(source, /mobile navigation labels are clipped/);
  assert.match(source, /page\.on\('response', onResponse\)/);
  assert.match(source, /visible images failed to load/);
  assert.match(source, /naturalWidth === 0/);
});

test('mobile audit narrowly permits documented compatibility and media fallbacks', () => {
  assert.match(source, /optionalCompatibilityPaths/);
  assert.match(source, /admin\/research\/summary/);
  assert.match(source, /admin\/research\/sessions/);
  assert.match(source, /resourceType\(\)/);
  assert.match(source, /\['image', 'media'\]/);
});

test('mobile audit reports frontend and service environments without rewriting local to dev', () => {
  assert.match(source, /const serviceTarget = resolveTarget\(argv\)/);
  assert.doesNotMatch(source, /argv\.includes\('--target=local'\)/);
  assert.match(source, /frontendBaseUrl: baseUrl/);
  assert.match(source, /serviceTarget: serviceTarget\.name/);
});

test('mobile audit dismisses analytics consent before measuring product layouts', () => {
  assert.match(source, /estospaces_cookie_consent/);
  assert.match(source, /rejected/);
});

test('mobile audit supports narrow-device runs and saves clean viewport proofs', () => {
  assert.match(source, /MOBILE_AUDIT_VIEWPORT_WIDTH/);
  assert.match(source, /MOBILE_AUDIT_VIEWPORT_HEIGHT/);
  assert.match(source, /representativeRoutes/);
  assert.match(source, /-viewport\.png/);
});
