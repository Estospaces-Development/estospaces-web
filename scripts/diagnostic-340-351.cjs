/**
 * Diagnostic: inspect page content for failing selectors
 * Usage: node scripts/diagnostic-340-351.cjs
 *
 * Loads .env.e2e for credentials
 */

const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

// Load .env.e2e
const envFile = path.join(process.cwd(), '.env.e2e');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length) process.env[key.trim()] = valueParts.join('=').trim();
  });
}

const DEV_BASE_URL = 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';
const OUTPUT = path.join(process.cwd(), 'output', 'playwright', 'bugfix-proof-340-351');

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const E2E_USER_EMAIL = requireEnv('E2E_USER_EMAIL');
const E2E_USER_PASSWORD = requireEnv('E2E_USER_PASSWORD');
const E2E_ADMIN_EMAIL = requireEnv('E2E_ADMIN_EMAIL');
const E2E_ADMIN_PASSWORD = requireEnv('E2E_ADMIN_PASSWORD');

const SETTLE_MS = 2000;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loginViaForm(page, email, password) {
  // Clear any existing session
  await page.goto(DEV_BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto(`${DEV_BASE_URL}/sessions/create/`, { waitUntil: 'domcontentloaded' });
  await sleep(500);

  const emailField = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]').first();
  const passwordField = page.locator('input[name="password"], input[type="password"], input[placeholder*="password" i]').first();

  await emailField.waitFor({ state: 'visible', timeout: 20000 });
  await emailField.fill(email);
  await passwordField.fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/sessions'), { timeout: 30000 }),
    page.getByRole('button', { name: /^Sign In$/ }).click(),
  ]);
  await sleep(SETTLE_MS);
}

(async () => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // --- #341/#342/#343: Account Settings ---
  // Route is /user/dashboard/settings (not /user/account/settings)
  console.log('\n=== #341/#342/#343: Account Settings ===');
  await loginViaForm(page, E2E_USER_EMAIL, E2E_USER_PASSWORD);
  await page.goto(`${DEV_BASE_URL}/user/dashboard/settings`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(SETTLE_MS);

  const url = page.url();
  console.log(`Current URL: ${url}`);

  const buttons = await page.locator('button').all();
  console.log(`Buttons on settings page: ${buttons.length}`);
  for (const btn of buttons) {
    const text = await btn.innerText().catch(() => '');
    const visible = await btn.isVisible().catch(() => false);
    if (visible && text.trim()) console.log(`  - "${text.trim().substring(0, 60)}"`);
  }

  const inputs = await page.locator('input').all();
  console.log(`\nInputs on settings page: ${inputs.length}`);
  for (const inp of inputs) {
    const name = await inp.getAttribute('name').catch(() => '');
    const placeholder = await inp.getAttribute('placeholder').catch(() => '');
    const type = await inp.getAttribute('type').catch(() => '');
    const visible = await inp.isVisible().catch(() => false);
    if (visible) console.log(`  - type="${type}" name="${name}" placeholder="${placeholder}"`);
  }

  const bodyText = await page.locator('body').innerText();
  console.log(`\nBody text (first 500 chars): ${bodyText.substring(0, 500)}`);

  await page.screenshot({ path: path.join(OUTPUT, 'diagnostic-settings.png'), fullPage: true });

  // --- #344: Virtual Storage ---
  console.log('\n=== #344: Virtual Storage ===');
  await loginViaForm(page, E2E_USER_EMAIL, E2E_USER_PASSWORD);
  await page.goto(`${DEV_BASE_URL}/user/virtual-storage`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(SETTLE_MS);

  const vsUrl = page.url();
  console.log(`Current URL: ${vsUrl}`);

  const fileInputs = await page.locator('input[type="file"]').all();
  console.log(`File inputs: ${fileInputs.length}`);
  const uploadBtns = await page.locator('button:has-text("Upload"), button:has-text("Choose"), button:has-text("Browse")').all();
  console.log(`Upload buttons: ${uploadBtns.length}`);
  const headings = await page.locator('h1, h2, h3').all();
  console.log(`Headings: ${headings.length}`);
  for (const h of headings) {
    const text = await h.innerText().catch(() => '');
    if (text.trim()) console.log(`  - "${text.trim().substring(0, 60)}"`);
  }
  const vsBodyText = await page.locator('body').innerText();
  console.log(`Body text (first 300): ${vsBodyText.substring(0, 300)}`);
  await page.screenshot({ path: path.join(OUTPUT, 'diagnostic-virtual-storage.png'), fullPage: true });

  // --- #348: Admin Profile ---
  console.log('\n=== #348: Admin Profile ===');
  await loginViaForm(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  await page.goto(`${DEV_BASE_URL}/admin/profile`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(SETTLE_MS);

  const adminUrl = page.url();
  console.log(`Current URL: ${adminUrl}`);

  const avatarImg = await page.locator('img[alt*="avatar" i], img[alt*="profile" i], .avatar img').count();
  console.log(`Avatar images: ${avatarImg}`);
  const uploadInputs = await page.locator('input[type="file"]').all();
  console.log(`File inputs on admin profile: ${uploadInputs.length}`);
  const cameraBtns = await page.locator('button:has-text("Camera"), button:has-text("Upload"), button:has-text("Change"), [aria-label*="photo" i], [aria-label*="avatar" i]').all();
  console.log(`Camera/upload buttons: ${cameraBtns.length}`);
  const profileHeadings = await page.locator('h1, h2, h3').all();
  console.log(`Headings: ${profileHeadings.length}`);
  for (const h of profileHeadings) {
    const text = await h.innerText().catch(() => '');
    if (text.trim()) console.log(`  - "${text.trim().substring(0, 60)}"`);
  }
  const adminBodyText = await page.locator('body').innerText();
  console.log(`Body text (first 300): ${adminBodyText.substring(0, 300)}`);
  await page.screenshot({ path: path.join(OUTPUT, 'diagnostic-admin-profile.png'), fullPage: true });

  // --- #345: Homepage ---
  console.log('\n=== #345: Homepage Search ===');
  await page.goto(`${DEV_BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(SETTLE_MS);

  const homeUrl = page.url();
  console.log(`Current URL: ${homeUrl}`);

  const searchInputs = await page.locator('input').all();
  console.log(`All inputs on homepage: ${searchInputs.length}`);
  for (const inp of searchInputs) {
    const type = await inp.getAttribute('type').catch(() => '');
    const placeholder = await inp.getAttribute('placeholder').catch(() => '');
    const name = await inp.getAttribute('name').catch(() => '');
    const ariaLabel = await inp.getAttribute('aria-label').catch(() => '');
    const visible = await inp.isVisible().catch(() => false);
    if (visible) console.log(`  - type="${type}" name="${name}" placeholder="${placeholder}" aria-label="${ariaLabel}"`);
  }
  await page.screenshot({ path: path.join(OUTPUT, 'diagnostic-homepage.png'), fullPage: true });

  await browser.close();
  console.log('\n✅ Diagnostic complete — screenshots saved');
})();
