const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACTS = path.join(process.cwd(), 'output', 'playwright');
fs.mkdirSync(ARTIFACTS, { recursive: true });

const BASE = 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';
const API = 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app';

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const EMAIL = requireEnv('E2E_USER_EMAIL');
const PASSWORD = requireEnv('E2E_USER_PASSWORD');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Step 1: Native fetch login
  console.log('=== Step 1: API Login ===');
  const loginResp = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginData = await loginResp.json();
  const token = loginData?.data?.token;
  const rawUser = loginData?.data?.user;
  console.log('Login status:', loginResp.status, 'Role:', rawUser?.role);

  // Step 2: Navigate to SPA and set sessionStorage
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(({ token: t, user }) => {
    sessionStorage.setItem('esto_session_token', t);
    localStorage.setItem('estospaces_user', JSON.stringify(user));
  }, { token, user: rawUser });

  // Step 3: Navigate to Forgot Password / Reset Password page
  console.log('\n=== Forgot/Reset Password page ===');
  await page.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('URL:', page.url());

  const fpText = await page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
    return clone.innerText.substring(0, 3000);
  });
  console.log('\nFORGOT PASSWORD PAGE TEXT:');
  console.log(fpText);

  await page.screenshot({ path: path.join(ARTIFACTS, 'forgot-password.png'), fullPage: true }).catch(() => {});

  const fpSelects = await page.locator('select').all();
  console.log(`\nFound ${fpSelects.length} selects on forgot-password:`);
  for (const sel of fpSelects) {
    const al = await sel.getAttribute('aria-label').catch(() => '');
    const name = await sel.getAttribute('name').catch(() => '');
    const vis = await sel.isVisible().catch(() => false);
    if (vis) console.log(`  select: name="${name}" aria-label="${al}"`);
  }

  // Step 4: Navigate to settings/reset password
  console.log('\n=== Settings/Reset Password page ===');
  await page.goto(`${BASE}/user/settings`, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('URL:', page.url());

  const stext = await page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
    return clone.innerText.substring(0, 3000);
  });
  console.log('\nSETTINGS PAGE TEXT:');
  console.log(stext);

  await page.screenshot({ path: path.join(ARTIFACTS, 'user-settings.png'), fullPage: true }).catch(() => {});

  const stSelects = await page.locator('select').all();
  console.log(`\nFound ${stSelects.length} selects on settings:`);
  for (const sel of stSelects) {
    const al = await sel.getAttribute('aria-label').catch(() => '');
    const name = await sel.getAttribute('name').catch(() => '');
    const vis = await sel.isVisible().catch(() => false);
    if (vis) console.log(`  select: name="${name}" aria-label="${al}"`);
  }

  await browser.close();
  console.log('\nDone');
})();
