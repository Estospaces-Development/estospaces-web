const { spawnSync } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  E2E_USER_EMAIL: 'user@example.com',
  E2E_USER_PASSWORD: 'dev-user-change-me',
  E2E_MANAGER_EMAIL: 'manager@gmail.com',
  E2E_MANAGER_PASSWORD: 'Estospaces@123',
  E2E_ADMIN_EMAIL: 'admin@example.com',
  E2E_ADMIN_PASSWORD: 'dev-admin-change-me',
};

const playwrightCli = path.join(
  'C:/Users/jeevi/Estospaces/esto-app-projects/estospaces-web/node_modules/.bin/playwright.cmd'
);
const testFile = 'C:/Users/jeevi/Estospaces/esto-app-projects/estospaces-web/tests/e2e/smoke-test.spec.ts';
const webDir = 'C:/Users/jeevi/Estospaces/esto-app-projects/estospaces-web';

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
