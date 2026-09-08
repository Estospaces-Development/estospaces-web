const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { test } = require('node:test');
const { chromium } = require('playwright');

test('admin lead refresh updates the global card and filtered queue without stale analytics', async () => {
  const baseUrl = 'http://127.0.0.1:4327';
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4327', '--strictPort'], { stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      assert.equal(server.exitCode, null);
      try { ready = (await fetch(baseUrl)).ok; } catch { /* Local server startup. */ }
      if (ready) break;
      await delay(250);
    }
    assert.ok(ready, 'Local regression server must start');
    browser = await chromium.launch(process.platform === 'win32' ? { channel: 'chrome' } : {});
    const context = await browser.newContext({ viewport: { width: 283, height: 642 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl ? route.continue() : route.abort());
    await context.addInitScript(() => {
      sessionStorage.setItem('esto_session_token', 'local-regression-token');
      const user = JSON.stringify({ id: 'admin-count-test', email: 'admin@example.test', role: 'admin', isAuthenticated: true });
      localStorage.setItem('esto_user', user);
      localStorage.setItem('esto_user:admin', user);
      localStorage.setItem('estospaces_cookie_consent', 'rejected');
    });
    let active = 12;
    let analyticsRequests = 0;
    let failAnalytics = false;
    let delayedResponse;
    const errors = [];
    const writes = [];
    await context.route('**/api/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const pathname = url.pathname.replace(/^\/__dev_proxy\/[^/]+/, '');
      if (!['GET', 'OPTIONS'].includes(request.method())) writes.push(pathname);
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
        'access-control-allow-origin': baseUrl, 'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization, content-type',
      } });
      const result = { success: true, data: [] };
      if (pathname === '/api/v1/auth/me') result.data = { id: 'admin-count-test', email: 'admin@example.test', role: 'admin', first_name: 'QA' };
      if (pathname === '/api/v1/admin/analytics') {
        analyticsRequests++;
        if (failAnalytics) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Count temporarily unavailable' }) });
        result.data = { total_users: 1, active_leads: active, total_leads: 20, total_properties: 1, total_brokers: 1 };
      }
      if (pathname === '/api/v1/admin/leads') {
        if (url.searchParams.get('search')?.startsWith('slow')) {
          const held = delayedResponse;
          held.started();
          await held.release;
          await route.fulfill({ status: held.status, contentType: 'application/json', body: JSON.stringify(held.status === 200
            ? { success: true, data: [], pagination: { total: 0, page: 1, limit: 10 } }
            : { success: false, message: 'Obsolete request failed' }) });
          return;
        }
        const total = url.searchParams.get('search') ? 1 : active;
        const page = Number(url.searchParams.get('page'));
        result.pagination = { total, page, limit: 10 };
        result.data = Array.from({ length: Math.max(0, Math.min(10, total - (page - 1) * 10)) }, (_, i) => ({
          id: `lead-${page}-${i}`, lead_number: `LD-${page}-${i}`, name: 'Regression buyer', status: 'pending_broker_response', stage: 'matching', created_at: '2026-09-09T00:00:00Z', broker_id: 'broker-test',
        }));
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(`${baseUrl}/admin/users`, { waitUntil: 'domcontentloaded' });
    const card = page.getByText('Active Leads', { exact: true }).locator('..');
    const queue = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Lead Reassignment', exact: true }) });
    await card.getByText('12', { exact: true }).waitFor();
    await queue.getByText(/Showing 1-10 of 12/).waitFor();
    active = 11;
    const beforeRefresh = analyticsRequests;
    await queue.getByRole('button', { name: /Refresh/ }).click();
    await queue.getByText(/Showing 1-10 of 11/).waitFor();
    await card.getByText('11', { exact: true }).waitFor({ timeout: 5000 });
    assert.ok(analyticsRequests > beforeRefresh, 'Refresh must bypass the analytics cache');
    const afterRefresh = analyticsRequests;
    await queue.getByRole('button', { name: 'Next', exact: true }).click();
    await queue.getByText(/Showing 11-11 of 11/).waitFor();
    await queue.getByRole('textbox', { name: 'Search reassignment leads' }).fill('Regression');
    await queue.getByText(/Showing 1-1 of 1/).waitFor();
    await card.getByText('11', { exact: true }).waitFor();
    await page.getByText('Platform-wide totals. Lead results below follow their own filters.', { exact: true }).waitFor();
    for (const status of [200, 503]) {
      let started;
      let release;
      const startedPromise = new Promise(resolve => { started = resolve; });
      delayedResponse = { status, started, release: new Promise(resolve => { release = resolve; }) };
      await queue.getByRole('textbox', { name: 'Search reassignment leads' }).fill('slow');
      await Promise.race([startedPromise, delay(5000).then(() => { throw new Error('Held request did not start'); })]);
      const latestResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('search') === 'latest');
      await queue.getByRole('textbox', { name: 'Search reassignment leads' }).fill('latest');
      assert.equal((await latestResponse).status(), 200);
      await queue.getByText(/Showing 1-1 of 1/).waitFor();
      await card.getByText('11', { exact: true }).waitFor();
      const oldResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('search') === 'slow');
      release();
      await (await oldResponse).finished();
      await delay(100);
      assert.equal(await card.getByText('11', { exact: true }).count(), 1);
      assert.equal(await queue.getByText(/Showing 1-1 of 1/).count(), 1);
      assert.equal(await queue.getByText(/Lead reassignment data could not refresh/).count(), 0);
      assert.equal(await queue.getByRole('button', { name: /Refresh/ }).isEnabled(), true);
    }
    const holdNext = () => {
      let started;
      let release;
      const startedPromise = new Promise(resolve => { started = resolve; });
      delayedResponse = { status: 200, started, release: new Promise(resolve => { release = resolve; }) };
      return { release, started: () => Promise.race([startedPromise, delay(5000).then(() => { throw new Error('Held request did not start'); })]) };
    };
    const old = holdNext();
    await queue.getByRole('textbox', { name: 'Search reassignment leads' }).fill('slow-old');
    await old.started();
    const newer = holdNext();
    await queue.getByRole('textbox', { name: 'Search reassignment leads' }).fill('slow-new');
    await newer.started();
    const oldFinished = page.waitForResponse(response => new URL(response.url()).searchParams.get('search') === 'slow-old');
    old.release();
    await (await oldFinished).finished();
    await delay(100);
    assert.equal(await queue.getByRole('button', { name: /Refresh/ }).isDisabled(), true, 'Old request must not clear newer loading state');
    const newerFinished = page.waitForResponse(response => new URL(response.url()).searchParams.get('search') === 'slow-new');
    newer.release();
    await (await newerFinished).finished();
    await card.getByText(String(active), { exact: true }).waitFor();
    await queue.getByText('No open leads ready for reassignment', { exact: true }).first().waitFor();
    assert.equal(await queue.locator('[data-mobile-table="cards"] article').count(), 0);
    await queue.getByRole('textbox', { name: 'Search reassignment leads' }).fill('latest');
    await queue.getByText(/Showing 1-1 of 1/).waitFor();
    assert.equal(analyticsRequests, afterRefresh, 'Search and pagination must not refetch platform analytics');
    failAnalytics = true;
    active = 8;
    await queue.getByRole('textbox', { name: 'Search reassignment leads' }).fill('');
    await queue.getByText(/Showing 1-8 of 8/).waitFor();
    active = 7;
    await queue.getByRole('button', { name: /Refresh/ }).click();
    await page.getByRole('alert').filter({ hasText: 'Platform totals could not refresh' }).waitFor();
    await queue.getByText(/Showing 1-7 of 7/).waitFor();
    await card.getByText('11', { exact: true }).waitFor();
    failAnalytics = false;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await queue.getByText(`Showing 1-${active} of ${active} leads`, { exact: true }).waitFor();
    await card.getByText(String(active), { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, [], 'Regression must not mutate live or fixture records');
    await context.close();
  } finally {
    await browser?.close();
    server.kill();
  }
});
