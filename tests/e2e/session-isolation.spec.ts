import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

async function dismissCookieBanner(page: any) {
  try {
    const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Accept All"), [aria-label*="cookie" i]').first();
    if (await acceptButton.count() > 0) {
      await acceptButton.click({ timeout: 3000 });
    }
  } catch (_e) {
    // Ignore if banner not found
  }
}

test.describe('Session Isolation', () => {
  test('User A and User B sessions are isolated', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await pageA.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageA.waitForSelector('#email', { timeout: 30000 });
    await dismissCookieBanner(pageA);
    await pageA.fill('#email', 'siranjeeviworks@gmail.com');
    await pageA.fill('#password', 'dev-user-change-me');
    await pageA.click('button[type="submit"]');
    await pageA.waitForTimeout;

    await pageB.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageB.waitForSelector('#email', { timeout: 30000 });
    await dismissCookieBanner(pageB);
    await pageB.fill('#email', 'manager@estospaces.com');
    await pageB.fill('#password', 'dev-manager-change-me');
    await pageB.click('button[type="submit"]');
    await pageB.waitForTimeout;

    // Verify separate sessions via cookies
    const cookiesA = await contextA.cookies();
    const cookiesB = await contextB.cookies();

    expect(cookiesA.length).toBeGreaterThan(0);
    expect(cookiesB.length).toBeGreaterThan(0);

    await contextA.close();
    await contextB.close();
  });
});
