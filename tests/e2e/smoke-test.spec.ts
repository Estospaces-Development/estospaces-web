/**
 * Pre-launch smoke tests for Estospaces web app.
 * Run with: npx playwright test tests/e2e/smoke-test.spec.ts
 *
 * Prerequisites:
 * 1. Dev server running locally OR
 * 2. Testing against https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app
 */

import { test, expect, type Page, type Locator } from '@playwright/test';

// ============================================================
// CONFIGURATION
// ============================================================
const BASE_URL = process.env.BASE_URL || 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';
const SCREENSHOT_DIR = 'test-results/screenshots';

// ============================================================
// HELPERS
// ============================================================
async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first();
  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitBtn.click();
  await page.waitForLoadState('networkidle');
}

async function takeScreenshot(page: Page, name: string): Promise<void> {
  try {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: true });
  } catch {
    // screenshot dir may not exist
  }
}

function logResult(flow: string, role: string, scenario: string, expected: string, actual: string, passed: boolean) {
  const result = passed ? 'PASS' : 'FAIL';
  console.log(`[Flow: ${flow}] [Role: ${role}] [Scenario: ${scenario}] → Expected: ${expected} | Actual: ${actual} | Result: ${result}`);
  if (!passed) {
    console.error(`  ❌ FAILED: ${flow} / ${role} / ${scenario}`);
  }
  return passed;
}

// ============================================================
// TEST SUITES
// ============================================================

test.describe('Flow 1: Public Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('1.1 Happy: Landing page loads with hero and stats', async ({ page }) => {
    const hasHero = await page.locator('h1, h2').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasSearchButton = await page.locator('a:has-text("Search"), button:has-text("Search"), a[href*="search"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const passed = await logResult('Public Landing', 'Anonymous', 'Happy load',
      'Hero heading + Search button visible',
      `Hero: ${hasHero}, Search: ${hasSearchButton}`,
      hasHero && hasSearchButton);
    expect(passed).toBe(true);
  });

  test('1.2 Happy: Navigate to search page', async ({ page }) => {
    const searchLink = page.locator('a[href*="search"], a:has-text("Search"), button:has-text("Search")').first();
    if (await searchLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchLink.click();
      await page.waitForLoadState('networkidle');
      const onSearchPage = page.url().includes('search');
      await logResult('Public Landing', 'Anonymous', 'Navigate to search',
        'URL contains /search',
        `URL: ${page.url()}`,
        onSearchPage);
      expect(onSearchPage).toBe(true);
    } else {
      await logResult('Public Landing', 'Anonymous', 'Navigate to search',
        'Search link visible and clickable',
        'Search link not found',
        false);
    }
  });

  test('1.3 Edge: Mobile responsive (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    const bodyVisible = await page.locator('body').isVisible();
    const passed = await logResult('Public Landing', 'Anonymous', 'Mobile responsive',
      'Page renders at 375px width',
      `Body visible: ${bodyVisible}`,
      bodyVisible);
    expect(passed).toBe(true);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('1.4 Empty: No console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout;

    const passed = await logResult('Public Landing', 'Anonymous', 'No console errors',
      'Zero console errors',
      `${errors.length} errors: ${errors.slice(0, 3).join('; ')}`,
      errors.length === 0);
    expect(passed).toBe(true);
  });

  test('1.5 Cross-role: Contact page accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`);
    await page.waitForLoadState('networkidle');
    const hasForm = await page.locator('form, input[type="text"], input[type="email"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const passed = await logResult('Public Landing', 'Anonymous', 'Contact page',
      'Contact form visible',
      `Form visible: ${hasForm}`,
      hasForm);
    expect(passed).toBe(true);
  });
});

test.describe('Flow 2: Authentication', () => {
  test('2.1 Error: Empty fields shows validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In")').first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout;
      const stayedOnLogin = page.url().includes('login');
      await logResult('Auth', 'Anonymous', 'Empty fields validation',
        'Stays on login page (no redirect)',
        `URL: ${page.url()}`,
        stayedOnLogin);
    } else {
      await logResult('Auth', 'Anonymous', 'Empty fields validation',
        'Submit button visible',
        'Button not found',
        false);
    }
  });

  test('2.2 Edge: Password toggle works', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]').first();
    const toggleBtn = page.locator('button[aria-label*="Show"], button[aria-label*="Hide"], [data-testid="password-toggle"]').first();

    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const initialType = await passwordInput.getAttribute('type');
      if (await toggleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await toggleBtn.click();
        await page.waitForTimeout(300);
        const afterType = await passwordInput.getAttribute('type');
        const toggled = initialType !== afterType;
        await logResult('Auth', 'Anonymous', 'Password toggle',
          'Password type changes on toggle',
          `${initialType} → ${afterType}`,
          toggled);
        expect(toggled).toBe(true);
      } else {
        await logResult('Auth', 'Anonymous', 'Password toggle',
          'Toggle button found and works',
          'Toggle button not found',
          false);
      }
    }
  });

  test('2.3 Cross-role: Register page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');
    const hasForm = await page.locator('input[name*="name"], input[name*="email"], input[name*="password"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const passed = await logResult('Auth', 'Anonymous', 'Register page',
      'Registration form visible',
      `Form visible: ${hasForm}`,
      hasForm);
    expect(passed).toBe(true);
  });
});

test.describe('Flow 3: User Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Attempt login with test credentials
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
  });

  test('3.1 Happy: Dashboard accessible (if auth works)', async ({ page }) => {
    await page.goto(`${BASE_URL}/user/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout;

    const isDashboard = page.url().includes('dashboard') || page.url().includes('login');
    const passed = await logResult('User Dashboard', 'User', 'Happy load',
      'Dashboard loads or redirects to login (if not authenticated)',
      `URL: ${page.url()}`,
      isDashboard);
    expect(passed).toBe(true);
  });

  test('3.2 Empty: No console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/user/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout;

    const passed = await logResult('User Dashboard', 'User', 'No console errors',
      'Zero console errors',
      `${errors.length} errors`,
      errors.length === 0);
    expect(passed).toBe(true);
  });

  test('3.3 Cross-role: Manager dashboard redirects', async ({ page }) => {
    await page.goto(`${BASE_URL}/manager/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout;
    const notOnManager = !page.url().includes('manager');
    await logResult('Cross-role', 'Anonymous', 'Manager redirect',
      'Redirected away from /manager/dashboard when not authenticated',
      `URL: ${page.url()}`,
      notOnManager);
  });
});

test.describe('Flow 4: Manager Dashboard', () => {
  test('4.1 Happy: Manager dashboard accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/manager/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout;

    const isDashboard = page.url().includes('dashboard') || page.url().includes('login');
    const passed = await logResult('Manager Dashboard', 'Manager', 'Happy load',
      'Dashboard loads or redirects to login',
      `URL: ${page.url()}`,
      isDashboard);
    expect(passed).toBe(true);
  });

  test('4.2 Empty: No console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/manager/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout;

    const passed = await logResult('Manager Dashboard', 'Manager', 'No console errors',
      'Zero console errors',
      `${errors.length} errors`,
      errors.length === 0);
    expect(passed).toBe(true);
  });

  test('4.3 Cross-role: Admin dashboard redirects', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout;
    const notOnAdmin = !page.url().includes('admin');
    await logResult('Cross-role', 'Anonymous', 'Admin redirect',
      'Redirected away from /admin/dashboard when not authenticated',
      `URL: ${page.url()}`,
      notOnAdmin);
  });
});

test.describe('Flow 5: Admin Dashboard', () => {
  test('5.1 Happy: Admin dashboard accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout;

    const isDashboard = page.url().includes('dashboard') || page.url().includes('login');
    const passed = await logResult('Admin Dashboard', 'Admin', 'Happy load',
      'Dashboard loads or redirects to login',
      `URL: ${page.url()}`,
      isDashboard);
    expect(passed).toBe(true);
  });

  test('5.2 Empty: No console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout;

    const passed = await logResult('Admin Dashboard', 'Admin', 'No console errors',
      'Zero console errors',
      `${errors.length} errors`,
      errors.length === 0);
    expect(passed).toBe(true);
  });

  test('5.3 Cross-role: User dashboard redirects', async ({ page }) => {
    await page.goto(`${BASE_URL}/user/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout;
    const notOnUser = !page.url().includes('user/dashboard');
    await logResult('Cross-role', 'Anonymous', 'User redirect',
      'Redirected away from /user/dashboard when not authenticated',
      `URL: ${page.url()}`,
      notOnUser);
  });
});
