const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require('playwright');

const baseUrl = 'http://127.0.0.1:4312';
let server;
const stopServer = async () => {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise((resolve) => server.once('exit', resolve));
  server.kill();
  await Promise.race([exited, delay(5000)]);
};

before(async () => {
  try {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4312', '--strictPort'], { stdio: 'ignore' });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      assert.equal(server.exitCode, null, 'Local regression server stopped before becoming ready');
      try { ready = (await fetch(baseUrl)).ok; } catch { /* Wait for local Vite startup. */ }
      if (ready) break;
      await delay(250);
    }
    assert.ok(ready, 'Local regression server did not start');
  } catch (error) {
    await stopServer();
    throw error;
  }
});
after(stopServer);
const caseId = 'case-299-local';
const documentId = 'document-299-local';
const staleFileUrl = 'https://example.test/sale-id.pdf';
const signedFileUrl = 'https://signed.example.test/sale-id.pdf?signature=local';

const json = (data, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(status < 400
    ? { success: true, data }
    : { success: false, error: data }),
});

const fastTrackCase = {
  id: caseId,
  case_id: caseId,
  header: {
    property_id: 'property-299-local',
    property_title: 'Local PDF regression property',
    property_type: 'Apartment',
    property_country: 'India',
    listing_type: 'sale',
    journey_type: 'sale',
    client_id: 'client-299-local',
    client_name: 'Local Regression Client',
    manager_id: 'manager-299-local',
    submitted_at: '2026-05-06T10:00:00.000Z',
  },
  stage: 'handover',
  final_status: 'completed',
  documents: {
    items: [{
      id: 'identity',
      label: 'Identity',
      status: 'approved',
      document_record_id: documentId,
      file_name: 'sale-id.pdf',
      file_url: staleFileUrl,
      mime_type: 'application/pdf',
      uploaded_at: '2026-05-06T10:10:00.000Z',
      reviewed_at: '2026-05-06T10:15:00.000Z',
      reviewed_by: 'admin-299-local',
    }],
    all_uploaded: true,
    all_approved: true,
  },
  viewing: { status: 'completed' },
  decision: { mode: 'sale', status: 'accepted', currency: 'INR' },
  agreement: { status: 'accepted', payment_status: 'paid' },
  handover: { status: 'completed', completed_at: '2026-05-06T11:00:00.000Z' },
  activity: [],
};

const openWorkspace = async (accessResult, width) => {
  let browser;
  let context;
  let page;
  const apiRequests = [];
  const documentNavigations = [];
  const pageErrors = [];

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width, height: 642 } });

    await context.addInitScript(() => {
    if (window.top !== window) {
      return;
    }
    sessionStorage.setItem('esto_session_token', 'local-regression-token');
    const storedUser = JSON.stringify({
      id: 'manager-299-local',
      email: 'manager.299@example.test',
      name: 'Local Regression Manager',
      role: 'manager',
      isAuthenticated: true,
    });
    localStorage.setItem('esto_user', storedUser);
    localStorage.setItem('esto_user:manager', storedUser);
    localStorage.setItem('estospaces_cookie_consent', 'rejected');
    });

    await context.route('https://example.test/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    documentNavigations.push(url.href);
    await route.abort();
    });
    await context.route('https://signed.example.test/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    documentNavigations.push(url.href);
    await route.abort();
    });

    await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    const servicePath = url.pathname.replace(/^\/__dev_proxy\/[^/]+/, '');
    apiRequests.push(`${request.method()} ${servicePath}`);

    if (servicePath === '/api/v1/auth/me') {
      await route.fulfill(json({
        id: 'manager-299-local',
        email: 'manager.299@example.test',
        first_name: 'Local',
        last_name: 'Manager',
        role: 'manager',
      }));
      return;
    }

    if (servicePath === '/api/v1/brokers/profile') {
      await route.fulfill(json({
        id: 'broker-299-local',
        user_id: 'manager-299-local',
        profile_type: 'broker',
        verification_status: 'approved',
        country: 'India',
      }));
      return;
    }

    if (servicePath === '/api/v1/fast-track') {
      await route.fulfill(json([fastTrackCase]));
      return;
    }

    if (servicePath === `/api/v1/documents/${documentId}/access-url`) {
      if (accessResult === 'not-found') {
        await route.fulfill(json('document not found', 404));
      } else {
        await route.fulfill(json({ access_url: signedFileUrl, expires_at: '2026-09-05T12:00:00Z' }));
      }
      return;
    }

    if (servicePath.startsWith('/api/v1/users/workspace-preferences/fast-track')) {
      await route.fulfill(json({}));
      return;
    }

    await route.fulfill(json([]));
    });

    page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    await page.goto(`${baseUrl}/manager/fast-track?case=${caseId}&section=documents`, {
      waitUntil: 'domcontentloaded',
    });

    const visibleCaseCard = page.locator(`[data-fast-track-case-card="${caseId}"]:visible`).first();
    if (await visibleCaseCard.count() === 0) {
      const casesButton = page.locator('[data-fast-track-toggle-rail]:visible').first();
      await casesButton.waitFor({ timeout: 15000 });
      await casesButton.click();
    }
    await visibleCaseCard.waitFor({ timeout: 15000 });
    await visibleCaseCard.click();

    if (width < 640) {
      const stagePicker = page.getByRole('combobox', { name: 'Choose fast-track stage' });
      await stagePicker.waitFor({ timeout: 15000 });
      await stagePicker.selectOption('documents');
    } else {
      const documentStage = page.locator('[data-fast-track-stage-tab="documents"]:visible').first();
      await documentStage.waitFor({ timeout: 15000 });
      await documentStage.scrollIntoViewIfNeeded();
      await documentStage.click();
    }

    const documentCard = page.locator('[data-fast-track-document-card="identity"]:visible').first();
    await documentCard.waitFor({ timeout: 15000 });

    return { browser, context, page, documentCard, apiRequests, documentNavigations, pageErrors };
  } catch (error) {
    if (page) {
      console.error(JSON.stringify({
        width,
        url: page.url(),
        body: (await page.locator('body').innerText().catch(() => '')).slice(0, 1200),
        apiRequests,
      }, null, 2));
    }
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    throw error;
  }
};

const closeWorkspace = async (context, browser) => {
  await Promise.allSettled([context.close(), browser.close()]);
};

const countVisible = async (locator) => {
  let visibleCount = 0;
  for (let index = 0; index < await locator.count(); index += 1) {
    if (await locator.nth(index).isVisible()) visibleCount += 1;
  }
  return visibleCount;
};

for (const width of [283, 1440]) {
test(`at ${width}px access-url 404 stays visible and never falls back to the stale PDF URL`, async () => {
  const state = await openWorkspace('not-found', width);
  const { browser, context, page, documentCard, apiRequests, documentNavigations, pageErrors } = state;
  try {
    const previewButton = documentCard.getByRole('button', { name: 'Preview Identity', exact: true });
    await previewButton.scrollIntoViewIfNeeded();
    await previewButton.click();
    await page.getByText('document not found', { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 10000 });

    const visibleErrors = await countVisible(page.getByText('document not found', { exact: false }));
    const staleIframes = await page.locator(`iframe[src^="${staleFileUrl}"]`).count();

    assert.deepEqual(pageErrors, [], `unexpected page errors: ${pageErrors.join('; ')}`);
    assert.ok(
      apiRequests.some((request) => request === `GET /api/v1/documents/${documentId}/access-url`),
      `document access endpoint was not called: ${apiRequests.join(', ')}`,
    );
    assert.deepEqual(
      { hasVisibleAccessError: visibleErrors > 0, staleIframeCount: staleIframes },
      { hasVisibleAccessError: true, staleIframeCount: 0 },
      'the failed access request must remain visible and must not render the stale backend file_url',
    );
    assert.deepEqual(
      documentNavigations.filter((url) => url.startsWith(staleFileUrl)),
      [],
      'the failed access request must not navigate to the stale backend file_url',
    );
  } finally {
    await closeWorkspace(context, browser);
  }
});

test(`at ${width}px Open keeps an access-url 404 visible and never navigates to the stale PDF URL`, async () => {
  const state = await openWorkspace('not-found', width);
  const { browser, context, page, documentCard, apiRequests, documentNavigations, pageErrors } = state;
  const popupNavigations = [];
  page.on('popup', (popup) => {
    popupNavigations.push(popup.url());
    popup.on('framenavigated', (frame) => {
      if (frame === popup.mainFrame()) {
        popupNavigations.push(frame.url());
      }
    });
  });

  try {
    const openButton = documentCard.getByRole('button', { name: 'Open Identity', exact: true });
    await openButton.scrollIntoViewIfNeeded();
    await openButton.click();
    await page.getByText('document not found', { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 10000 });

    const visibleErrors = await countVisible(page.getByText('document not found', { exact: false }));
    assert.deepEqual(pageErrors, [], `unexpected page errors: ${pageErrors.join('; ')}`);
    assert.ok(
      apiRequests.some((request) => request === `GET /api/v1/documents/${documentId}/access-url`),
      `document access endpoint was not called: ${apiRequests.join(', ')}`,
    );
    assert.equal(visibleErrors > 0, true, 'the Open action must preserve the access error');
    assert.deepEqual(
      [...documentNavigations, ...popupNavigations].filter((url) => url.startsWith(staleFileUrl)),
      [],
      'the Open action must not navigate to the stale backend file_url',
    );
  } finally {
    await closeWorkspace(context, browser);
  }
});

test(`at ${width}px access-url success previews the issued signed PDF URL instead of the stale file URL`, async () => {
  const state = await openWorkspace('success', width);
  const { browser, context, page, documentCard, apiRequests, pageErrors } = state;
  try {
    const previewButton = documentCard.getByRole('button', { name: 'Preview Identity', exact: true });
    await previewButton.scrollIntoViewIfNeeded();
    await previewButton.click();
    const iframes = page.locator(`iframe[src="${signedFileUrl}"]:visible`);
    await iframes.first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(250);

    assert.deepEqual(pageErrors, [], `unexpected page errors: ${pageErrors.join('; ')}`);
    assert.ok(
      apiRequests.some((request) => request === `GET /api/v1/documents/${documentId}/access-url`),
      `document access endpoint was not called: ${apiRequests.join(', ')}`,
    );
    assert.equal(await page.locator(`iframe[src^="${staleFileUrl}"]`).count(), 0);
    assert.ok(await iframes.count() > 0, 'the access endpoint issued URL must be the iframe source');
  } finally {
    await closeWorkspace(context, browser);
  }
});


}
