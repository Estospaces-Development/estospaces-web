const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const modulePath = path.join(__dirname, 'platform-proof-shared.cjs');

test('resolveTarget reads dev service URLs from env files', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platform-proof-shared-'));
  const originalCwd = process.cwd();

  try {
    fs.writeFileSync(
      path.join(tempDir, '.env.gcp-dev'),
      [
        'FRONTEND_URL=http://127.0.0.1:3000',
        'VITE_CORE_SERVICE_URL=https://env-core.example.test',
        'VITE_BOOKING_SERVICE_URL=https://env-booking.example.test',
      ].join('\n'),
    );

    process.chdir(tempDir);
    delete require.cache[modulePath];
    const { resolveTarget } = require(modulePath);

    const target = resolveTarget(['--target=dev']);

    assert.equal(target.baseUrl, 'http://127.0.0.1:3000');
    assert.equal(target.services.core, 'https://env-core.example.test');
    assert.equal(target.services.booking, 'https://env-booking.example.test');
  } finally {
    process.chdir(originalCwd);
    delete require.cache[modulePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('resolveTarget defaults dev web to Cloud Run when FRONTEND_URL is absent', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platform-proof-shared-'));
  const originalCwd = process.cwd();

  try {
    fs.writeFileSync(
      path.join(tempDir, '.env.gcp-dev'),
      [
        'VITE_CORE_SERVICE_URL=https://env-core.example.test',
        'VITE_BOOKING_SERVICE_URL=https://env-booking.example.test',
      ].join('\n'),
    );

    process.chdir(tempDir);
    delete require.cache[modulePath];
    const { resolveTarget } = require(modulePath);

    const target = resolveTarget(['--target=dev']);

    assert.equal(target.baseUrl, 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app');
    assert.equal(target.appBaseUrl, 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app');
    assert.equal(target.adminBaseUrl, 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app');
    assert.equal(target.services.core, 'https://env-core.example.test');
    assert.equal(target.services.booking, 'https://env-booking.example.test');
  } finally {
    process.chdir(originalCwd);
    delete require.cache[modulePath];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('resolveTarget defaults production services to customer load-balancer domains', () => {
  const envNames = [
    'E2E_PROD_CORE_URL',
    'E2E_PROD_BOOKING_URL',
    'E2E_PROD_PAYMENT_URL',
    'E2E_PROD_NOTIFICATION_URL',
    'E2E_PROD_SEARCH_URL',
    'E2E_PROD_MEDIA_URL',
    'E2E_PROD_MESSAGING_URL',
  ];
  const originalValues = new Map(envNames.map((name) => [name, process.env[name]]));

  try {
    envNames.forEach((name) => delete process.env[name]);
    delete require.cache[modulePath];
    const { resolveTarget } = require(modulePath);

    const target = resolveTarget(['--target=prod']);

    assert.deepEqual(target.services, {
      core: 'https://core-api.estospaces.com',
      booking: 'https://booking-api.estospaces.com',
      payment: 'https://payment-api.estospaces.com',
      notification: 'https://notification-api.estospaces.com',
      search: 'https://search-api.estospaces.com',
      media: 'https://media-api.estospaces.com',
      messaging: 'https://messaging-api.estospaces.com',
    });
  } finally {
    for (const [name, value] of originalValues) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
    delete require.cache[modulePath];
  }
});

test('isIgnorableConsoleError only ignores the known Firefox Google Fonts warning', async () => {
  delete require.cache[modulePath];
  const { isIgnorableConsoleError } = require(modulePath);

  assert.equal(
    isIgnorableConsoleError('[JavaScript Error: "downloadable font: download failed source: https://fonts.gstatic.com/s/inter/v20/example.woff2"]'),
    true,
  );
  assert.equal(
    isIgnorableConsoleError('Error: app shell crashed while loading dashboard'),
    false,
  );
  assert.equal(
    isIgnorableConsoleError('[JavaScript Error: "downloadable font: download failed source: https://fonts.gstatic.com.attacker.example/example.woff2"]'),
    false,
  );
});
