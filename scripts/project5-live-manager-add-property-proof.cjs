const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const baseUrl = process.env.E2E_DEV_BASE_URL || 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';
const coreUrl = process.env.E2E_DEV_CORE_URL || 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app';
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'project5-155-183', `live-manager-add-property-${runId}`);

fs.mkdirSync(outputDir, { recursive: true });

async function login() {
  const response = await fetch(`${coreUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'manager@example.com', password: 'dev-manager-change-me' }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`manager login failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return {
    token: payload.data?.token || payload.token,
    user: payload.data?.user || payload.user,
  };
}

(async () => {
  const manager = await login();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('esto_token', token);
    localStorage.setItem('esto_user', JSON.stringify({ ...user, isAuthenticated: true }));
  }, { token: manager.token, user: manager.user });

  const page = await context.newPage();
  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (/estospaces|run\.app/.test(response.url()) && response.status() >= 500) {
      failedRequests.push({ status: response.status(), url: response.url() });
    }
  });

  await page.goto(`${baseUrl}/manager/dashboard/properties/add`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: path.join(outputDir, 'initial-top.png'), fullPage: true });

  const initialScrollY = await page.evaluate(() => window.scrollY);
  assert.ok(initialScrollY < 80, `add-property page should open at top, got scrollY=${initialScrollY}`);

  const emptyNumericInputs = await page.locator('input[type="number"]').evaluateAll((inputs) => inputs.map((input) => ({
    label: input.getAttribute('aria-label') || input.id || input.name || input.placeholder || 'number input',
    value: input.value,
  })));
  const autoFilledInputs = emptyNumericInputs.filter((input) => input.value === '0.01');
  assert.deepEqual(autoFilledInputs, [], `empty numeric inputs should not auto-fill 0.01: ${JSON.stringify(autoFilledInputs)}`);

  await page.locator('input[type="number"]').first().focus().catch(() => {});
  await page.keyboard.press('Tab').catch(() => {});
  const afterFocusValues = await page.locator('input[type="number"]').evaluateAll((inputs) => inputs.map((input) => input.value));
  assert.ok(!afterFocusValues.includes('0.01'), 'focusing/blur empty numeric fields should not auto-fill 0.01');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('button', { name: /Next|Continue|Save/i }).first().click({ timeout: 15000 });
  await page.waitForTimeout(900);
  const afterValidationScrollY = await page.evaluate(() => window.scrollY);
  const bodyText = await page.locator('body').innerText();
  assert.ok(afterValidationScrollY < 400, `validation should bring manager near first error/top, got scrollY=${afterValidationScrollY}`);
  assert.match(bodyText, /required|Please|Property|Title|Name/i);

  await page.screenshot({ path: path.join(outputDir, 'validation-scroll-first-error.png'), fullPage: true });
  assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
  assert.deepEqual(failedRequests, []);

  await context.close();
  await browser.close();

  const result = {
    status: 'passed',
    outputDir,
    initialScrollY,
    numericInputCount: emptyNumericInputs.length,
    afterValidationScrollY,
  };
  fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
