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
