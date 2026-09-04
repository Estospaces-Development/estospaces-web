const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { before, after, test } = require('node:test');
const { chromium } = require('playwright');

const baseUrl = 'http://127.0.0.1:4311';
let server;
let browser;
const json = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4311', '--strictPort'], { stdio: 'ignore' });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    assert.equal(server.exitCode, null, 'Local regression server stopped before becoming ready');
    try { ready = (await fetch(baseUrl)).ok; } catch { /* Wait for local Vite startup. */ }
    if (ready) break;
    await delay(250);
  }
  assert.ok(ready, 'Local regression server did not start');
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.kill();
});

for (const width of [283, 1280]) {
  for (const failFirst of [false, true]) {
    test(`draft save at ${width}px prevents duplicate submission${failFirst ? ' and allows retry after failure' : ''}`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 642 } });
      let createRequests = 0;
      let savedProperty = null;
      const pageErrors = [];
      try {
        await context.addInitScript(() => {
          sessionStorage.setItem('esto_session_token', 'local-regression-token');
          const user = JSON.stringify({ id: 'manager-local-regression', email: 'manager.local@example.test', name: 'Local Regression Manager', role: 'manager', isAuthenticated: true });
          localStorage.setItem('esto_user', user);
          localStorage.setItem('esto_user:manager', user);
          localStorage.setItem('estospaces_cookie_consent', 'rejected');
        });
        // Every application API is intercepted: this test never writes to a live environment.
        await context.route('**/api/**', async (route) => {
          const request = route.request();
          const servicePath = new URL(request.url()).pathname.replace(/^\/__dev_proxy\/[^/]+/, '');
          if (servicePath === '/api/v1/auth/me') {
            await route.fulfill(json({ id: 'manager-local-regression', email: 'manager.local@example.test', first_name: 'Local', last_name: 'Manager', role: 'manager' }));
          } else if (servicePath === '/api/v1/brokers/profile') {
            await route.fulfill(json({ id: 'broker-local-regression', user_id: 'manager-local-regression', profile_type: 'broker', verification_status: 'approved', country: 'India' }));
          } else if (servicePath === '/api/v1/properties/mine') {
            await route.fulfill(json({ data: savedProperty ? [savedProperty] : [], pagination: { page: 1, limit: 12, total: savedProperty ? 1 : 0, total_pages: 1 } }));
          } else if (servicePath === '/api/v1/properties' && request.method() === 'POST') {
            createRequests += 1;
            if (failFirst && createRequests === 1) {
              await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: { message: 'Synthetic draft save failure' } }) });
            } else {
              const payload = request.postDataJSON();
              assert.equal(payload.status, 'draft');
              savedProperty = { ...payload, id: 'draft-regression', status: 'draft', created_at: '2026-09-05T00:00:00Z', updated_at: '2026-09-05T00:00:00Z' };
              await route.fulfill(json(savedProperty));
            }
          } else {
            await route.fulfill(json([]));
          }
        });
        const page = await context.newPage();
        page.on('pageerror', (error) => pageErrors.push(String(error)));
        await page.goto(`${baseUrl}/manager/dashboard/properties/add`, { waitUntil: 'domcontentloaded' });
        await page.getByLabel(/Property Title/i).fill('QA local draft duplicate-submit regression');
        const save = page.getByRole('button', { name: /^Save Draft$/i }).first();
        await save.click();
        if (failFirst) {
          await page.getByText(/Failed to save draft:/).waitFor();
          assert.equal(await save.isDisabled(), false, 'Failed saves must permit retry');
          await save.click();
        }
        await page.getByText('Property saved as draft successfully!').waitFor();
        // Exercise the reported 1.5-second success-to-navigation window.
        await page.waitForTimeout(800);
        const disabledDuringRedirect = await page.getByRole('button', { name: /^Saving\.\.\.$/i }).first().isDisabled();
        await page.getByRole('button', { name: /^Saving\.\.\.$/i }).first().evaluate((button) => button.click());
        assert.equal(disabledDuringRedirect, true);
        await page.waitForURL('**/manager/dashboard/properties');
        await page.getByRole('heading', { name: 'QA local draft duplicate-submit regression', exact: true }).waitFor();
        await page.reload();
        await page.getByRole('heading', { name: 'QA local draft duplicate-submit regression', exact: true }).waitFor();
        assert.ok(await page.getByText('Draft', { exact: true }).count() > 0, 'Saved draft status must survive reload');
        assert.equal(createRequests, failFirst ? 2 : 1, 'Redirect gap must not create another property');
        assert.deepEqual(pageErrors, []);
      } finally {
        await context.close();
      }
    });
  }
}
