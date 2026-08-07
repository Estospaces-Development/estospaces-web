import { test, expect, type Page } from '@playwright/test';
import { join } from 'path';

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'screenshots', 'ticket-fixes');

async function captureScreenshot(page: Page, ticketId: string, label: string) {
  const path = join(SCREENSHOT_DIR, `issue-${ticketId}-${label}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`Captured: issue-${ticketId}-${label}.png`);
}

const BASE = 'http://localhost:3000';

async function loginAsManager(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('esto_user:manager', JSON.stringify({
      id: 'm1', role: 'manager', email: 'manager@test.com', name: 'Test Manager',
      isAuthenticated: true, verification_status: 'incomplete'
    }));
  });
}

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('esto_user:admin', JSON.stringify({
      id: 'a1', role: 'admin', email: 'admin@test.com', name: 'Admin User',
      isAuthenticated: true
    }));
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('Capture Fix Screenshots', () => {
  test.beforeAll(async () => {
    await import('fs').then(fs => fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true }));
  });

  test('#381 - Verification Last Updated Timestamp', async ({ page }) => {
    await loginAsManager(page);
    await page.goto(`${BASE}/manager/verification`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout;
    await captureScreenshot(page, '381', 'verification-timestamp');
  });

  test('#382 - Manager Profile Company Name (no placeholder)', async ({ page }) => {
    await loginAsManager(page);
    await page.goto(`${BASE}/manager/profile`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout;
    await captureScreenshot(page, '382', 'profile-company-name');
  });

  test('#383 - Save Changes Toast Feedback', async ({ page }) => {
    await loginAsManager(page);
    await page.goto(`${BASE}/manager/profile`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout;
    const saveBtn = page.locator('button:has-text("Save Changes")').first();
    if (await saveBtn.count() > 0) {
      await captureScreenshot(page, '383', 'save-changes-button');
    } else {
      await captureScreenshot(page, '383', 'profile-save-ui');
    }
  });

  test('#384 - Admin Verification Company Name', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/admin/verifications`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout;
    await captureScreenshot(page, '384', 'admin-company-name');
  });

  test('#385 - Admin Verification Manager Data', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/admin/verifications`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout;
    await captureScreenshot(page, '385', 'admin-manager-data');
  });

  test('#386 - Profile Save Persistence', async ({ page }) => {
    await loginAsManager(page);
    await page.goto(`${BASE}/manager/profile`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout;
    await captureScreenshot(page, '386', 'profile-persistence-form');
  });

  test('#387 - Fast Track Manager Cases Only', async ({ page }) => {
    await loginAsManager(page);
    await page.goto(`${BASE}/manager/fast-track`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout;
    await captureScreenshot(page, '387', 'fast-track-manager-only');
  });

  test('#388 - Fast Track Verification Gate', async ({ page }) => {
    await loginAsManager(page);
    await page.goto(`${BASE}/manager/fast-track`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout;
    await captureScreenshot(page, '388', 'fast-track-gate');
  });

  test('#389 - Activity Audit Actor Name', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/admin/verifications`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout;
    await captureScreenshot(page, '389', 'admin-audit-log');
  });

  test('#390 - Property Form No Invalid Defaults', async ({ page }) => {
    await loginAsManager(page);
    await page.goto(`${BASE}/manager/dashboard/properties/add`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout;
    await captureScreenshot(page, '390', 'property-form-no-defaults');
  });
});
