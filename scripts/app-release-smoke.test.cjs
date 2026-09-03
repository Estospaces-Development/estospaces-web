const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'app-release-smoke.cjs'), 'utf8');

test('release smoke probes the Cloud Run compatible login route', () => {
  assert.match(source, /\{ route: '\/login\/'/);
  assert.match(source, /adminBaseUrl\}\/login\//);
  assert.match(source, /\/\\\/login\\\/\?\$/);
});

test('release smoke requires the rendered Admin login form in every browser pass', () => {
  assert.match(source, /browser:\$\{label\}:admin-login-form/);
  assert.match(source, /target\.adminBaseUrl\}\/login\//);
  assert.match(source, /input\[name="email"\], input\[type="email"\]/);
  assert.match(source, /input\[name="password"\], input\[type="password"\]/);
  assert.match(source, /emailVisible && passwordVisible/);
});

test('release smoke includes the minimum supported narrow mobile viewport', () => {
  assert.match(source, /\{ width: 283, height: 642 \}, 'chromium-narrow'/);
});

test('release smoke verifies an exact build header only when requested', () => {
  assert.match(source, /E2E_EXPECTED_BUILD_REVISION/);
  assert.match(source, /servedBuildRevision === expectedBuildRevision/);
});
