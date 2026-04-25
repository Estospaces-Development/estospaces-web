const fs = require('node:fs');
const { chromium } = require('playwright');
const {
  buildArtifactPath,
  createAuthedContext,
  ensureReachable,
  getRoleBaseUrl,
  loginViaApi,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

const crashPattern = /toast is not defined|unexpected application error|something went wrong|application error|referenceerror|cannot access .* before initialization/i;

const routeMatrix = {
  user: [
    '/user/dashboard',
    '/user/applications',
    '/user/dashboard/viewings',
    '/user/dashboard/messages',
    '/user/dashboard/contracts',
    '/user/docs',
    '/user/dashboard/help',
    '/user/dashboard/fast-track',
  ],
  manager: [
    '/manager/dashboard',
    '/manager/fast-track',
    '/manager/dashboard/properties',
    '/manager/leads',
    '/manager/applications',
    '/manager/contracts',
    '/manager/appointments',
    '/manager/messages',
    '/manager/docs',
    '/manager/help',
    '/manager/case-files',
  ],
  admin: [
    '/admin/dashboard',
    '/admin/analytics',
    '/admin/fast-track',
    '/admin/help',
    '/admin/profile',
    '/admin/properties',
    '/admin/users',
    '/admin/verifications',
  ],
};

async function assertHealthy(page, expectedPrefix) {
  await page.waitForTimeout(1500);
  const current = new URL(page.url());
  if (!current.pathname.startsWith(expectedPrefix)) {
    throw new Error(`Expected ${expectedPrefix} but landed on ${page.url()}`);
  }
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => (document.body?.innerText || '').trim().length >= 40, null, { timeout: 15000 }).catch(() => {});
  const bodyText = await page.locator('body').innerText();
  if (crashPattern.test(bodyText)) {
    throw new Error(`Crash text detected on ${expectedPrefix}`);
  }
  if (bodyText.trim().length < 40) {
    throw new Error(`Page ${expectedPrefix} rendered too little content`);
  }
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  const artifactPath = buildArtifactPath(`dashboard-surfaces-${target.name}-proof.json`);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const roleName of Object.keys(routeMatrix)) {
      const baseUrl = getRoleBaseUrl(target, roleName);
      await ensureReachable(baseUrl);
      const session = await loginViaApi(target, roleName);
      try {
        results.push({ role: roleName, route: 'session', status: 'passed', actualUrl: baseUrl, pageErrors: [], consoleErrors: [], networkErrors: [] });
        for (const route of routeMatrix[roleName]) {
          const context = await createAuthedContext(browser, session);
          const page = await context.newPage();
          const pageErrors = [];
          const consoleErrors = [];
          const networkErrors = [];

          page.on('pageerror', (error) => pageErrors.push(String(error)));
          page.on('console', (msg) => {
            if (msg.type() === 'error') {
              const text = msg.text();
              if (!/^Failed to load resource:/i.test(text)) {
                consoleErrors.push(text);
              }
            }
          });
          page.on('response', (response) => {
            const url = response.url();
            if (response.status() >= 400 && !/favicon|manifest|apple-touch-icon/i.test(url)) {
              networkErrors.push(`${response.status()} ${url}`);
            }
          });

          try {
            await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
            await assertHealthy(page, route);
            const status = pageErrors.length === 0 && consoleErrors.length === 0 && networkErrors.length === 0
              ? 'passed'
              : 'failed';
            results.push({
              role: roleName,
              route,
              status,
              actualUrl: page.url(),
              pageErrors,
              consoleErrors,
              networkErrors,
            });
          } catch (error) {
            results.push({
              role: roleName,
              route,
              status: 'failed',
              error: String(error),
              actualUrl: page.url(),
              pageErrors,
              consoleErrors,
              networkErrors,
            });
          } finally {
            await context.close();
          }
        }
      } finally {
      }
    }
  } finally {
    await browser.close();
  }

  const payload = {
    target: target.name,
    steps: results,
    overallOk: results.every((item) => item.status === 'passed'),
  };

  fs.writeFileSync(artifactPath, JSON.stringify(payload, null, 2));
  if (!payload.overallOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
