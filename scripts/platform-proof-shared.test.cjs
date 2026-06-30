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
});
