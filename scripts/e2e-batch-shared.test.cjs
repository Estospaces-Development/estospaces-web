const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.join(__dirname, 'e2e-batch-shared.cjs');
const credentialEnvNames = [
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
  'E2E_MANAGER_EMAIL',
  'E2E_MANAGER_PASSWORD',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
];

function withoutCredentials(run) {
  const original = Object.fromEntries(credentialEnvNames.map((name) => [name, process.env[name]]));
  for (const name of credentialEnvNames) {
    delete process.env[name];
  }
  delete require.cache[modulePath];

  try {
    run();
  } finally {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
    delete require.cache[modulePath];
  }
}

test('batch catalog generation does not require role credentials', () => {
  withoutCredentials(() => {
    const { generateCatalog, summarizeCatalog } = require(modulePath);
    const catalog = generateCatalog();
    const summary = summarizeCatalog(catalog);

    assert.equal(catalog.length, 10368);
    assert.equal(summary.scenario_count, 10368);
    assert.equal(summary.batch_count, 144);
  });
});

test('batch role credential access stays strict when a run needs auth', () => {
  withoutCredentials(() => {
    const { getRole } = require(modulePath);
    const role = getRole('user');

    assert.throws(() => role.email, /Missing required environment variable: E2E_USER_EMAIL/);
    assert.throws(() => role.password, /Missing required environment variable: E2E_USER_PASSWORD/);
  });
});

test('authentication wall detection accepts the production login screen rendered during a protected-route redirect', () => {
  const { isAuthenticationWallVisible } = require(modulePath);

  assert.equal(isAuthenticationWallVisible('Sign in to Estospaces\nEnter your email and password to continue'), true);
  assert.equal(isAuthenticationWallVisible('Dashboard\nWelcome back\nYour applications'), false);
});

test('signed-out authorization stays fail-closed when login copy renders at a protected URL', () => {
  const { assessSignedOutDestination } = require(modulePath);

  assert.deepEqual(
    assessSignedOutDestination('/manager/dashboard', 'Dashboard\nForgot password'),
    { allowed: false, authenticationWallVisible: true },
  );
  assert.equal(assessSignedOutDestination('/login/', 'Sign in to Estospaces').allowed, true);
  assert.equal(assessSignedOutDestination('/auth/recover', 'Reset password').allowed, true);
  assert.equal(assessSignedOutDestination('/login-private', 'Sign in to Estospaces').allowed, false);
  assert.equal(assessSignedOutDestination('/authorities', 'Sign in to Estospaces').allowed, false);
  assert.equal(assessSignedOutDestination('/user/properties/property-1', 'Property details', true).allowed, true);
});

test('batch result status fails the command for failed or blocked scenarios', () => {
  const { resolveBatchExitCode } = require(modulePath);

  assert.equal(resolveBatchExitCode({ passed: 6, failed: 0, blocked: 0 }), 0);
  assert.equal(resolveBatchExitCode({ passed: 5, failed: 1, blocked: 0 }), 1);
  assert.equal(resolveBatchExitCode({ passed: 5, failed: 0, blocked: 1 }), 1);
});

test('batch contexts reject optional analytics without enabling tracking', () => {
  const { analyticsConsentStorage } = require(modulePath);

  assert.deepEqual(analyticsConsentStorage, {
    key: 'estospaces_cookie_consent',
    value: 'rejected',
  });
});

test('batch evidence records only screenshot paths that actually exist', () => {
  const { keepExistingArtifactPath } = require(modulePath);

  assert.equal(keepExistingArtifactPath('proof.png', (value) => value === 'proof.png'), 'proof.png');
  assert.equal(keepExistingArtifactPath('missing.png', () => false), null);
  assert.equal(keepExistingArtifactPath('', () => true), null);
});

test('batch render timeout gives production redirects a thirty-second budget and accepts an explicit override', () => {
  const { resolveRenderTimeoutMs } = require(modulePath);

  assert.equal(resolveRenderTimeoutMs({}), 30000);
  assert.equal(resolveRenderTimeoutMs({ E2E_RENDER_TIMEOUT_MS: '45000' }), 45000);
  assert.equal(resolveRenderTimeoutMs({ E2E_RENDER_TIMEOUT_MS: 'invalid' }), 30000);
});

test('startup route waits for role routing regardless of auth state', () => {
  const { isStartupRoutePending } = require(modulePath);

  assert.equal(isStartupRoutePending('/', '/user/dashboard'), true);
  assert.equal(isStartupRoutePending('/login', '/user/dashboard'), false);
  assert.equal(isStartupRoutePending('/', '/'), false);
});
