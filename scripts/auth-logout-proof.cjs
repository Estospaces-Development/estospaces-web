const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  createAuthedContext,
  getRoleBaseUrl,
  loginViaApi,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'auth-logout-proof', runId);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function attachDiagnostics(page, result) {
  page.on('pageerror', (error) => result.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      const text = message.text();
      if (!/^Failed to load resource:/i.test(text) && !/downloadable font/i.test(text)) {
        result.consoleMessages.push({ type: message.type(), text });
      }
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 500 && /estospaces|localhost|127\.0\.0\.1/i.test(response.url())) {
      result.networkErrors.push({ status: response.status(), url: response.url() });
    }
  });
}

async function verifyLogout(browser, target, role) {
  const session = await loginViaApi(target, role);
  const context = await createAuthedContext(browser, session);
  const page = await context.newPage();
  const dashboard = role === 'admin' ? '/admin/dashboard' : role === 'manager' ? '/manager/dashboard' : '/user/dashboard';
  const result = {
    role,
    dashboard,
    status: 'running',
    finalUrl: '',
    screenshotBeforeLogout: path.join(outputDir, `${role}-before-logout.png`),
    screenshotAfterLogout: path.join(outputDir, `${role}-after-logout.png`),
    authCleared: false,
    pageErrors: [],
    consoleMessages: [],
    networkErrors: [],
  };
  attachDiagnostics(page, result);

  try {
    await page.goto(`${getRoleBaseUrl(target, role)}${dashboard}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.locator('body').waitFor({ state: 'visible', timeout: 30000 });
    await page.screenshot({ path: result.screenshotBeforeLogout, fullPage: true });

    await openProfileMenuIfNeeded(page);
    const signOut = page.getByRole('button', { name: /sign out|log out/i }).last();
    await signOut.waitFor({ state: 'visible', timeout: 30000 });
    await signOut.click();
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 60000 });
    result.finalUrl = page.url();
    await page.locator('input[name="email"], input[type="email"]').first().waitFor({ state: 'visible', timeout: 30000 });
    result.authCleared = await page.evaluate(() => !localStorage.getItem('esto_token') && !localStorage.getItem('esto_user'));
    await page.screenshot({ path: result.screenshotAfterLogout, fullPage: true });
    result.status = result.authCleared
      && result.pageErrors.length === 0
      && result.consoleMessages.length === 0
      && result.networkErrors.length === 0
      ? 'passed'
      : 'failed';
    if (result.status === 'failed' && !result.authCleared) {
      result.error = 'Auth localStorage state was not cleared after logout.';
    } else if (result.status === 'failed') {
      result.error = 'Browser diagnostics contained errors.';
    }
  } catch (error) {
    result.status = 'failed';
    result.error = error?.message || String(error);
    result.finalUrl = page.url();
    await page.screenshot({ path: result.screenshotAfterLogout, fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
  return result;
}

async function openProfileMenuIfNeeded(page) {
  const visibleSignOut = page.getByRole('button', { name: /sign out|log out/i });
  if (await visibleSignOut.first().isVisible().catch(() => false)) {
    return;
  }
  const profileMenu = page.getByRole('button', { name: /open profile menu/i }).first();
  if (await profileMenu.count()) {
    await profileMenu.click();
    return;
  }
  const avatarMenu = page.locator('button[aria-haspopup="menu"]').first();
  if (await avatarMenu.count()) {
    await avatarMenu.click();
  }
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  ensureDir(outputDir);
  const browser = await chromium.launch({ headless: true });
  const report = {
    target: target.name,
    baseUrl: target.baseUrl,
    outputDir,
    startedAt: new Date().toISOString(),
    steps: [],
    overallOk: false,
  };

  try {
    for (const role of ['user', 'manager', 'admin']) {
      report.steps.push(await verifyLogout(browser, target, role));
    }
  } finally {
    await browser.close();
  }

  report.completedAt = new Date().toISOString();
  report.overallOk = report.steps.every((step) => step.status === 'passed');
  const outputPath = path.join(outputDir, 'auth-logout-proof.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, overallOk: report.overallOk }, null, 2));
  if (!report.overallOk) process.exitCode = 1;
}

main().catch((error) => {
  ensureDir(outputDir);
  fs.writeFileSync(path.join(outputDir, 'auth-logout-proof.error.json'), `${JSON.stringify({
    error: error?.stack || String(error),
    completedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.error(error?.stack || error);
  process.exit(1);
});
