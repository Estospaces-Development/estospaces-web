const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const baseUrl = 'http://127.0.0.1:4331';
const viewports = [{ width: 375, height: 812 }, { width: 283, height: 642 }];
let server;
let browser;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4331', '--strictPort'], { stdio: 'ignore' });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    assert.equal(server.exitCode, null);
    try { ready = (await fetch(baseUrl)).ok; } catch { /* Local server startup. */ }
    if (ready) break;
    await delay(250);
  }
  assert.ok(ready, 'Local regression server must start');
  browser = await chromium.launch(process.platform === 'win32' ? { channel: 'chrome' } : {});
});

after(async () => {
  await browser?.close();
  server?.kill();
});

// Signed-in context at the given viewport. Everything that is not the local dev server is mocked or aborted.
async function openContext(viewport, role, routes, initScript) {
  const context = await browser.newContext({ viewport });
  await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl ? route.continue() : route.abort());
  await context.addInitScript(({ role: r }) => {
    sessionStorage.setItem('esto_session_token', 'local-regression-token');
    const user = JSON.stringify({ id: `${r}-proof`, email: `${r}@example.test`, role: r, isAuthenticated: true });
    localStorage.setItem('esto_user', user);
    localStorage.setItem(`esto_user:${r}`, user);
    localStorage.setItem('estospaces_cookie_consent', 'rejected');
  }, { role });
  if (initScript) await context.addInitScript(initScript);
  const writes = [];
  await context.route('**/api/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname.replace(/^\/__dev_proxy\/[^/]+/, '');
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
      'access-control-allow-origin': baseUrl, 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization, content-type',
    } });
    if (request.method() !== 'GET') writes.push({ method: request.method(), pathname });
    const data = pathname === '/api/v1/auth/me' ? { id: `${role}-proof`, email: `${role}@example.test`, role, first_name: 'QA' } : routes(pathname) ?? [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
  return { context, writes };
}

test('user viewings card: no stray zero price, no overflow, 44px actions (#734, #736)', async () => {
  const soon = new Date(Date.now() + 3 * 86400000).toISOString();
  const viewing = (id, title, price) => ({
    id, property_id: `prop-${id}`, status: 'pending', scheduled_at: soon, created_at: new Date().toISOString(),
    property_title: title, property_address: '1 Example Street, London, SW1A 1AA', property_price: price,
    property_country: 'GB', property_currency: 'GBP', listing_type: 'sale', agent_name: 'Alex Agent', manager_id: 'mgr-1',
  });
  const longTitle = 'Spacious five bedroom detached family home with an exceptionally long listing title';
  for (const viewport of viewports) {
    const { context } = await openContext(viewport, 'user', pathname => {
      if (pathname === '/api/v1/viewings') return [viewing('free', longTitle, 0), viewing('priced', 'Priced flat', 450000)];
      if (pathname === '/api/v1/properties/catalog/context') return [{ id: 'prop-free' }, { id: 'prop-priced' }];
    });
    const errors = [];
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/user/dashboard/viewings`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      const cards = page.locator('.group.rounded-2xl').filter({ has: page.getByRole('button', { name: 'Cancel Appointment' }) });
      await cards.nth(1).waitFor();
      const free = cards.filter({ hasText: longTitle });
      const priced = cards.filter({ hasText: 'Priced flat' });
      assert.equal(await free.count(), 1);
      assert.equal(await free.evaluate(card => {
        const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
        let zeros = 0;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent.trim() === '0') zeros++;
        return zeros;
      }), 0, `${viewport.width}: a 0-priced viewing must not render a stray "0" (#736)`);
      await priced.getByText(/450,000/).waitFor();
      for (const card of [free, priced]) {
        const cancel = card.getByRole('button', { name: 'Cancel Appointment' });
        const fit = await cancel.evaluate(button => ({
          scrollWidth: button.scrollWidth, clientWidth: button.clientWidth,
          right: button.getBoundingClientRect().right, cardRight: button.closest('.group').getBoundingClientRect().right,
        }));
        assert.ok(fit.scrollWidth <= fit.clientWidth, `${viewport.width}: Cancel Appointment text overflows its button (#734)`);
        assert.ok(fit.right <= fit.cardRight, `${viewport.width}: Cancel Appointment leaves its card (#734)`);
        for (const button of await card.getByRole('button').all()) {
          assert.ok((await button.boundingBox()).height >= 44, `${viewport.width}: action buttons must be at least 44px tall`);
        }
      }
      const scroll = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
      assert.ok(scroll.scrollWidth <= scroll.innerWidth, `${viewport.width}: page scrolls horizontally`);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
});

test('manager properties: draft share explained, link copied, delete dialog fits (#739, #743)', async () => {
  const property = (id, title, status) => ({
    id, title, status, price: 350000, currency: 'GBP', country: 'GB', listing_type: 'sale', property_type: 'house',
    address_line_1: '2 Example Road', city: 'London', postcode: 'E1 6AN', bedrooms: 3, bathrooms: 2, property_size_sqft: 1200,
    image_urls: [], created_at: '2026-09-01T00:00:00Z',
  });
  // Long enough that the dialog content is taller than either viewport, so it has to scroll inside the dialog.
  const soldTitle = `Sold period townhouse ${'with a deliberately long title to stress the dialog '.repeat(16).trim()}`;
  const list = [property('p-draft', 'Draft cottage', 'draft'), property('p-live', 'Live apartment', 'available'), property('p-sold', soldTitle, 'sold')];
  for (const viewport of viewports) {
    const { context, writes } = await openContext(viewport, 'manager', pathname => {
      if (pathname === '/api/v1/properties/mine') return { data: list, pagination: { page: 1, limit: 12, total: 3, total_pages: 1 } };
    }, () => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      window.__copied = [];
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__copied.push(text); } }, configurable: true });
    });
    const errors = [];
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/manager/dashboard/properties`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      const cardFor = title => page.locator('.group').filter({ has: page.getByRole('heading', { name: title }) }).last();
      await cardFor('Live apartment').waitFor();

      // #739: a draft cannot be shared, and the tap says why instead of doing nothing.
      await cardFor('Draft cottage').getByRole('button', { name: /Draft properties can't be shared/ }).click({ force: true }); // aria-disabled, still tappable
      await page.getByText("Draft properties can't be shared", { exact: true }).first().waitFor();
      assert.equal(await page.getByRole('dialog').count(), 0, 'A blocked share must not open a share dialog');

      // Published: no native share, clipboard available -> the public link is copied.
      await cardFor('Live apartment').getByRole('button', { name: /Share Live apartment/ }).click();
      await page.getByText(/Property link copied/).first().waitFor();
      const copied = await page.evaluate(() => window.__copied);
      assert.deepEqual(copied.map(url => new URL(url).pathname), ['/user/properties/p-live']);
      assert.equal(await page.getByRole('dialog').count(), 0, 'Copying the link must not open the share dialog');

      // #743: the delete confirmation fits the viewport with both buttons visible; Cancel sends nothing.
      const writesBefore = writes.length;
      await cardFor(soldTitle).hover();
      await page.getByRole('button', { name: `Delete ${soldTitle}` }).click();
      const dialog = page.getByRole('dialog', { name: 'Delete property confirmation' });
      await dialog.waitFor();
      const inView = box => box.top >= 0 && box.bottom <= viewport.height && box.left >= 0 && box.right <= viewport.width;
      const rect = locator => locator.evaluate(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; });
      assert.ok(inView(await rect(dialog)), `${viewport.height}: delete dialog must fit the viewport`);
      for (const name of ['Cancel', 'Delete property']) {
        assert.ok(inView(await rect(dialog.getByRole('button', { name, exact: true }))), `${viewport.height}: "${name}" must be fully visible`);
      }
      // dispatchEvent, not a pointer click: at 283x642 this deliberately oversized dialog sits under the fixed bottom navigation (z-30).
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).dispatchEvent('click');
      await dialog.waitFor({ state: 'hidden' });
      await delay(200);
      assert.deepEqual(writes.slice(writesBefore).filter(write => write.method === 'DELETE' || /delete/i.test(write.pathname)), [], 'Cancel must not send a delete request');
      assert.ok(!writes.some(write => write.method === 'DELETE'), 'No DELETE request may be sent');
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
});
