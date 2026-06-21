const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const baseUrl = process.env.E2E_DEV_BASE_URL || 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';
const coreUrl = process.env.E2E_DEV_CORE_URL || 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app';
const bookingUrl = process.env.E2E_DEV_BOOKING_URL || 'https://estospaces-booking-service-dev-zaryfkxmeq-nw.a.run.app';
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'project5-155-183', `live-fast-track-cross-role-${runId}`);

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

async function api(base, pathname, token, options = {}) {
  const response = await fetch(`${base}${pathname}`, {
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

async function tryApi(base, pathname, token, options = {}) {
  try {
    await api(base, pathname, token, options);
    return `${options.method || 'GET'} ${pathname}: ok`;
  } catch (error) {
    return `${options.method || 'GET'} ${pathname}: ${error.message}`;
  }
}

function browserUserPayload(session, role) {
  const name = [session.user.first_name, session.user.last_name].filter(Boolean).join(' ').trim() || session.user.email;
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role || role,
    first_name: session.user.first_name,
    last_name: session.user.last_name,
    name,
    isAuthenticated: true,
  };
}

async function newRolePage(browser, session, role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('esto_token', token);
    localStorage.setItem('esto_user', JSON.stringify(user));
  }, { token: session.token, user: browserUserPayload(session, role) });

  const page = await context.newPage();
  const evidence = {
    role,
    pageErrors: [],
    failedRequests: [],
  };
  page.on('pageerror', (error) => evidence.pageErrors.push(error.message));
  page.on('response', (response) => {
    if (/estospaces|run\.app/.test(response.url()) && response.status() >= 500) {
      evidence.failedRequests.push({ status: response.status(), url: response.url() });
    }
  });
  return { context, page, evidence };
}

async function pageText(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  return page.locator('body').innerText({ timeout: 10000 });
}

(async () => {
  const admin = await login('admin@example.com', 'dev-admin-change-me');
  const manager = await login('manager@example.com', 'dev-manager-change-me');
  const user = await login('user@example.com', 'dev-user-change-me');

  const title = `Codex Project5 FastTrack ${runId}`;
  let propertyId = null;
  let leadId = null;
  let caseId = null;
  const result = { outputDir, title };

  try {
    const property = await api(coreUrl, '/api/v1/properties', manager.token, {
      method: 'POST',
      body: JSON.stringify({
        title,
        status: 'draft',
        property_type: 'apartment',
        listing_type: 'rent',
        price: 25000,
        currency: 'INR',
        address_line_1: 'QA Fast Track Street',
        city: 'Bengaluru',
        country: 'India',
      }),
    });
    propertyId = property.id;

    const lead = await api(coreUrl, '/api/v1/leads', user.token, {
      method: 'POST',
      body: JSON.stringify({ property_id: propertyId }),
    });
    leadId = lead.id;

    const fastTrackCase = await api(bookingUrl, '/api/v1/fast-track', user.token, {
      method: 'POST',
      body: JSON.stringify({
        property_id: propertyId,
        lead_id: leadId,
        client_name: [user.user.first_name, user.user.last_name].filter(Boolean).join(' ').trim() || user.user.email,
        property_title: title,
        property_type: 'rent',
        property_country: 'India',
        listing_type: 'rent',
        started_from: 'direct_property',
      }),
    });
    caseId = fastTrackCase.id;

    const managerCases = await api(bookingUrl, '/api/v1/fast-track', manager.token);
    const managerFound = managerCases.find((item) => (
      item.id === caseId
      || item.case_id === caseId
      || item.header?.property_id === propertyId
    ));
    assert.ok(managerFound, 'manager fast-track API list must include the user-created case');
    Object.assign(result, {
      propertyId,
      leadId,
      caseId,
      managerId: managerFound.header?.manager_id,
      clientName: managerFound.header?.client_name,
    });

    const browser = await chromium.launch({ headless: true });
    const uiEvidence = [];
    try {
      const userPageState = await newRolePage(browser, user, 'user');
      try {
        await userPageState.page.goto(`${baseUrl}/user/dashboard/fast-track?case=${caseId}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await userPageState.page.getByText(title).first().waitFor({ timeout: 30000 });
        const text = await pageText(userPageState.page);
        assert.match(text, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'user fast-track workspace should show the created case');
        await userPageState.page.screenshot({ path: path.join(outputDir, 'user-fast-track-case-visible.png'), fullPage: true });
        uiEvidence.push(userPageState.evidence);
      } finally {
        await userPageState.context.close();
      }

      const managerPageState = await newRolePage(browser, manager, 'manager');
      try {
        await managerPageState.page.goto(`${baseUrl}/manager/fast-track?case=${caseId}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await managerPageState.page.getByText(title).first().waitFor({ timeout: 30000 });
        const text = await pageText(managerPageState.page);
        assert.match(text, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'manager fast-track workspace should show the user-created case');
        await managerPageState.page.screenshot({ path: path.join(outputDir, 'manager-fast-track-case-visible.png'), fullPage: true });
        uiEvidence.push(managerPageState.evidence);
      } finally {
        await managerPageState.context.close();
      }
    } finally {
      await browser.close();
    }

    const pageErrors = uiEvidence.flatMap((item) => item.pageErrors);
    const failedRequests = uiEvidence.flatMap((item) => item.failedRequests);
    assert.deepEqual(pageErrors, [], pageErrors.join('\n'));
    assert.deepEqual(failedRequests, []);

    fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify({
      status: 'passed',
      ...result,
      uiEvidence,
    }, null, 2));
    console.log(JSON.stringify({ status: 'passed', ...result }, null, 2));
  } finally {
    const cleanup = [];
    if (caseId) {
      cleanup.push(await tryApi(bookingUrl, `/api/v1/fast-track/${caseId}`, admin.token, { method: 'DELETE' }));
    }
    if (leadId) {
      cleanup.push(await tryApi(coreUrl, `/api/v1/leads/${leadId}`, manager.token, { method: 'DELETE' }));
    }
    if (propertyId) {
      cleanup.push(await tryApi(coreUrl, `/api/v1/properties/${propertyId}`, manager.token, { method: 'DELETE' }));
    }
    fs.writeFileSync(path.join(outputDir, 'cleanup.log'), cleanup.join('\n'));
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
