const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { before, after, test } = require('node:test');
const { chromium } = require('playwright');

const baseUrl = 'http://127.0.0.1:4314';
const output = path.resolve('output/playwright/admin-notification-mobile');
const title = 'Manager verification submitted';
const message = 'A manager has submitted verification documents for review.';
const fixtures = [
  { id: 'notification-layout-1', type: 'manager_verification_submitted', title, message, is_read: false, created_at: '2026-08-21T10:00:00Z' },
  { id: 'notification-layout-2', type: 'property_available', title: 'Property is available', message: 'A home is ready to view.', is_read: true, created_at: '2026-08-20T10:00:00Z' },
];
const json = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
let server;
let browser;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4314', '--strictPort'], { stdio: 'ignore' });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    assert.equal(server.exitCode, null, 'Local regression server exited');
    try { ready = (await fetch(baseUrl)).ok; } catch { /* Await local Vite startup. */ }
    if (ready) break;
    await delay(250);
  }
  assert.ok(ready, 'Local regression server did not start');
  await mkdir(output, { recursive: true });
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.kill();
});

for (const width of [283, 325, 390, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`admin notification content reflows at ${width}px in ${theme} mode`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 642 }, locale: 'en-US' });
      const pageErrors = [];
      const unexpectedWrites = [];
      try {
        await context.addInitScript((mode) => {
          sessionStorage.setItem('esto_session_token', 'local-regression-token');
          const user = JSON.stringify({ id: 'admin-local-regression', email: 'admin.local@example.test', name: 'Local Admin', role: 'admin', isAuthenticated: true });
          localStorage.setItem('esto_user', user);
          localStorage.setItem('esto_user:admin', user);
          localStorage.setItem('estospaces_cookie_consent', 'rejected');
          localStorage.setItem('estospaces-theme', mode);
        }, theme);
        // Intercept every application API: this regression never touches live data.
        await context.route('**/api/**', async (route) => {
          const request = route.request();
          const servicePath = new URL(request.url()).pathname.replace(/^\/__dev_proxy\/[^/]+/, '');
          if (!['GET', 'OPTIONS'].includes(request.method())) unexpectedWrites.push(`${request.method()} ${servicePath}`);
          if (servicePath === '/api/v1/auth/me') {
            await route.fulfill(json({ id: 'admin-local-regression', email: 'admin.local@example.test', first_name: 'Local', last_name: 'Admin', role: 'admin' }));
          } else if (servicePath === '/api/v1/notifications') {
            await route.fulfill(json({ notifications: fixtures, unread_count: 1 }));
          } else if (servicePath === '/api/v1/admin/analytics') {
            await route.fulfill(json({ total_users: 2, total_properties: 1, total_leads: 0, active_leads: 0, total_brokers: 1 }));
          } else {
            await route.fulfill(json([]));
          }
        });
        const page = await context.newPage();
        page.on('pageerror', (error) => pageErrors.push(String(error)));
        await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
        const panel = page.locator('#recent-notifications');
        const row = panel.getByRole('button', { name: new RegExp(title) });
        await row.waitFor();
        await row.scrollIntoViewIfNeeded();
        assert.equal(await page.locator('html').evaluate((element) => element.classList.contains('dark')), theme === 'dark', 'Requested theme must be applied');
        await page.screenshot({ path: path.join(output, `${width}-${theme}.png`) });
        const metrics = await row.evaluate((element, expectedTitle) => {
          const titleNode = Array.from(element.querySelectorAll('p')).find((node) => node.textContent.trim() === expectedTitle);
          const text = titleNode.firstChild;
          const wordLines = Array.from(expectedTitle.matchAll(/\S+/g)).map((match) => {
            const range = document.createRange();
            const offset = text.textContent.indexOf(expectedTitle) + match.index;
            range.setStart(text, offset);
            range.setEnd(text, offset + match[0].length);
            return { word: match[0], lines: new Set(Array.from(range.getClientRects()).map((rect) => rect.top)).size };
          });
          const messageNode = element.querySelectorAll('p')[1];
          const messageText = messageNode.firstChild;
          const messageWordLines = Array.from(messageText.textContent.matchAll(/\S+/g)).map((match) => {
            const range = document.createRange();
            range.setStart(messageText, match.index);
            range.setEnd(messageText, match.index + match[0].length);
            return { word: match[0], lines: new Set(Array.from(range.getClientRects()).map((rect) => rect.top)).size };
          });
          const timestamp = Array.from(element.querySelectorAll('span')).find((node) => node.textContent.includes('8/21/2026'));
          const titleBox = titleNode.getBoundingClientRect();
          const messageBox = messageNode.getBoundingClientRect();
          const dateBox = timestamp.getBoundingClientRect();
          return {
            wordLines, messageWordLines, titleWidth: titleBox.width, titleTop: titleBox.top,
            messageWidth: messageBox.width, messageHeight: messageBox.height,
            messageClipped: messageNode.scrollHeight > messageNode.clientHeight + 1 || messageNode.scrollWidth > messageNode.clientWidth + 1,
            messageBottom: messageBox.bottom, dateTop: dateBox.top,
            dateLeft: dateBox.left, titleRight: titleBox.right,
            pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
            overflow: titleNode.scrollWidth > titleNode.clientWidth,
          };
        }, title);
        assert.ok(metrics.wordLines.every((word) => word.lines === 1), `Title words must remain intact: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.messageWordLines.every((word) => word.lines === 1), `Message words must remain intact: ${JSON.stringify(metrics)}`);
        assert.equal(await row.getByText(message, { exact: true }).isVisible(), true, 'Message must be rendered, not merely present in the DOM');
        assert.ok(metrics.messageWidth > 0 && metrics.messageHeight > 0 && !metrics.messageClipped, 'Message must not be hidden or clipped');
        if (width < 640) assert.ok(metrics.titleWidth >= 120, `Mobile title needs readable width: ${JSON.stringify(metrics)}`);
        assert.equal(metrics.overflow, false);
        assert.ok(metrics.pageWidth <= metrics.viewportWidth, 'The notification panel must not overflow the page');
        if (width < 640) assert.ok(metrics.dateTop >= metrics.messageBottom, 'Mobile timestamp belongs below the content');
        else assert.ok(metrics.dateLeft >= metrics.titleRight, 'Desktop timestamp stays beside the content');
        assert.equal(await row.getByText(message, { exact: true }).count(), 1, 'Full message remains available');
        const search = panel.getByRole('searchbox', { name: 'Search recent notifications' });
        await search.fill('Manager');
        assert.equal(await panel.getByRole('button', { name: /Property is available/ }).count(), 0);
        assert.equal(await row.count(), 1);
        await search.press('Tab');
        assert.equal(await panel.getByRole('button', { name: 'Clear recent notification search' }).evaluate((button) => button === document.activeElement), true);
        await page.keyboard.press('Enter');
        assert.equal(await search.inputValue(), '');
        assert.equal(await panel.getByRole('button', { name: /Property is available/ }).count(), 1);
        await search.fill('no-such-notification');
        await panel.getByText('No recent notifications match this search', { exact: true }).waitFor();
        await page.reload();
        await row.waitFor();
        assert.equal(await search.inputValue(), '');
        assert.deepEqual(pageErrors, []);
        assert.deepEqual(unexpectedWrites, [], 'Searching and inspecting must not mark notifications as read');
      } finally {
        await context.close();
      }
    });
  }
}
