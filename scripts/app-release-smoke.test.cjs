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

test('release smoke prints sanitized failed check details before returning a failing exit code', () => {
  assert.match(source, /summarizeFailedResults\(results\)/);
  assert.match(source, /Failed release smoke checks:/);
});

test('failed smoke diagnostics retain safe evidence and remove secrets, response bodies, and query data', () => {
  const { summarizeFailedResults } = require('./release-smoke-diagnostics.cjs');
  const secret = 'password=QA-secret-token';
  const email = 'customer@example.com';
  const failed = summarizeFailedResults([
    {
      id: 'unauth:core-auth-me',
      status: 'failed',
      actual: JSON.stringify({ status: 200, body: `${email} ${secret}` }),
      expected: `Never echo ${secret}`,
      errors: [`https://core-api.estospaces.com/me?token=${secret}`],
    },
    {
      id: 'browser:chromium-narrow:admin-login-form',
      status: 'failed',
      actual: JSON.stringify({
        actualUrl: `https://admin.estospaces.com/login/?email=${email}&${secret}`,
        emailVisible: false,
        passwordVisible: false,
        textSample: `${email} ${secret}`,
      }),
      expected: secret,
      errors: [secret],
    },
    {
      id: 'browser-health:chromium-narrow',
      status: 'failed',
      actual: JSON.stringify({
        pageErrors: [secret],
        consoleErrors: [email],
        networkErrors: [`500 https://example.com/private?token=${secret}`],
      }),
      expected: secret,
      errors: [secret],
    },
    {
      id: `latency:https://${email}@service.example/private/${email}?token=${secret}#${secret}`,
      status: 'failed',
      actual: JSON.stringify({ max: 6000, samples: [{ status: 200, ms: 6000 }] }),
      expected: secret,
      errors: [secret],
    },
  ]);

  const serialized = JSON.stringify(failed);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes(email), false);
  assert.deepEqual(failed, [
    {
      id: 'unauth:core-auth-me',
      contract: 'Protected API rejects unauthenticated requests',
      status: 200,
    },
    {
      id: 'browser:chromium-narrow:admin-login-form',
      contract: 'Admin login renders visible email and password inputs',
      location: { hostname: 'admin.estospaces.com', pathname: '/login/' },
      emailVisible: false,
      passwordVisible: false,
    },
    {
      id: 'browser-health:chromium-narrow',
      contract: 'Browser pass has no page, console, or server errors',
      pageErrorCount: 1,
      consoleErrorCount: 1,
      networkErrorCount: 1,
    },
    {
      id: 'latency:service.example',
      contract: 'Endpoint returns without server errors inside the latency threshold',
      maxMs: 6000,
    },
  ]);
});
