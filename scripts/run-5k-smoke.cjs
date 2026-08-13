const { spawnSync } = require('child_process');
const path = require('path');

const requiredCredentials = [
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
  'E2E_MANAGER_EMAIL',
  'E2E_MANAGER_PASSWORD',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
];
for (const name of requiredCredentials) {
  if (!process.env[name]?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const env = { ...process.env };

const webDir = process.cwd();
const playwrightCli = path.join(webDir, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
const testFile = path.join(webDir, 'tests', 'e2e', 'smoke-test.spec.ts');

const result = spawnSync(
  playwrightCli,
  ['test', testFile, '--project=chromium-desktop', '--reporter=line'],
  {
    cwd: webDir,
    env,
    stdio: 'inherit',
    encoding: 'utf-8',
  }
);

process.exit(result.status ?? 0);
