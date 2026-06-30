const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const baseUrl = process.env.E2E_DEV_BASE_URL || 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';
const coreUrl = process.env.E2E_DEV_CORE_URL || 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app';
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'project5-155-183', `live-admin-review-mutation-${runId}`);

fs.mkdirSync(outputDir, { recursive: true });

async function login(email, password) {
  const response = await fetch(`${coreUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`login failed for ${email}: ${response.status} ${JSON.stringify(payload)}`);
  }
  return {
    token: payload.data?.token || payload.token,
    user: payload.data?.user || payload.user,
  };
}

async function api(pathname, token, options = {}) {
  const response = await fetch(`${coreUrl}${pathname}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${pathname} failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload.data ?? payload;
}

(async () => {
  const admin = await login('admin@example.com', 'dev-admin-change-me');
  const manager = await login('manager@example.com', 'dev-manager-change-me');
  const user = await login('user@example.com', 'dev-user-change-me');
  const unique = `Codex Project5 Review ${runId}`;
  let propertyId = null;
  let reviewId = null;
  const result = { outputDir, unique };

  try {
    const property = await api('/api/v1/properties', manager.token, {
      method: 'POST',
      body: JSON.stringify({
        title: unique,
        status: 'draft',
        property_type: 'house',
        listing_type: 'sale',
        price: 1000,
        currency: 'INR',
        address_line_1: 'QA Street',
        city: 'Bengaluru',
        country: 'India',
      }),
    });
    propertyId = property.id;

    const review = await api('/api/v1/reviews', user.token, {
      method: 'POST',
      body: JSON.stringify({
        property_id: propertyId,
        rating: 4,
        title: 'Project5 moderation proof',
        comment: unique,
      }),
    });
    reviewId = review.id;
    Object.assign(result, { propertyId, reviewId });

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await context.addInitScript(({ token, user }) => {
      localStorage.setItem('esto_token', token);
      localStorage.setItem('esto_user', JSON.stringify({ ...user, isAuthenticated: true }));
    }, { token: admin.token, user: admin.user });

    const page = await context.newPage();
    const pageErrors = [];
    const failedRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      if (/estospaces|run\.app/.test(response.url()) && response.status() >= 500) {
        failedRequests.push({ status: response.status(), url: response.url() });
      }
    });

    await page.goto(`${baseUrl}/admin/reviews`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.getByText(unique).waitFor({ timeout: 20000 });
    await page.screenshot({ path: path.join(outputDir, 'before-approval-pending-review.png'), fullPage: true });

    const approveButton = page.getByRole('button', { name: new RegExp(`Approve review for property ${propertyId}`, 'i') });
    await approveButton.click();
    await page.getByRole('dialog', { name: 'Review action confirmation' }).waitFor({ timeout: 10000 });
    await page.screenshot({ path: path.join(outputDir, 'confirmation-dialog.png'), fullPage: true });

    await page.locator('[role="dialog"]').getByRole('button', { name: 'Approve' }).click();
    await page.getByText(unique).waitFor({ state: 'detached', timeout: 20000 });
    await page.screenshot({ path: path.join(outputDir, 'after-approval-refreshed-pending-list.png'), fullPage: true });

    assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
    assert.deepEqual(failedRequests, []);

    await context.close();
    await browser.close();

    const allReviews = await api('/api/v1/admin/reviews', admin.token);
    const approved = Array.isArray(allReviews) ? allReviews.find((item) => item.id === reviewId) : null;
    result.approvedState = approved ? {
      id: approved.id,
      is_approved: approved.is_approved,
      comment: approved.comment,
    } : null;
    assert.equal(Boolean(approved?.is_approved), true, 'review should be approved after UI confirmation');

    fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify({ status: 'passed', ...result }, null, 2));
    console.log(JSON.stringify({ status: 'passed', ...result }, null, 2));
  } finally {
    const cleanup = [];
    if (reviewId) {
      try {
        await api(`/api/v1/reviews/${reviewId}`, admin.token, { method: 'DELETE' });
        cleanup.push('review deleted');
      } catch (error) {
        cleanup.push(`review cleanup failed: ${error.message}`);
      }
    }
    if (propertyId) {
      try {
        await api(`/api/v1/properties/${propertyId}`, manager.token, { method: 'DELETE' });
        cleanup.push('property deleted');
      } catch (error) {
        cleanup.push(`property cleanup failed: ${error.message}`);
      }
    }
    fs.writeFileSync(path.join(outputDir, 'cleanup.log'), cleanup.join('\n'));
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
