const fs = require('node:fs');
const { chromium } = require('playwright');
const {
  buildArtifactPath,
  createAuthedContext,
  ensureReachable,
  getRoleBaseUrl,
  loginViaApi,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const credentials = {
  user: { email: requireEnv('E2E_USER_EMAIL'), password: requireEnv('E2E_USER_PASSWORD'), dashboard: '/user/dashboard' },
  admin: { email: requireEnv('E2E_ADMIN_EMAIL'), password: requireEnv('E2E_ADMIN_PASSWORD'), dashboard: '/admin/dashboard' },
};

async function waitForTicketVisible(page, ticketId) {
  await page.waitForFunction((expectedId) => new URL(window.location.href).searchParams.get('ticket') === expectedId, ticketId, { timeout: 30000 });
}

async function waitForHelpWorkspace(page, ticketId, subject) {
  await waitForTicketVisible(page, ticketId);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  if (subject) {
    await page.locator('body').filter({ hasText: subject }).first().waitFor({ timeout: 30000 }).catch(() => {});
  }
}

async function fetchTicketById(ticketsUrl, token, ticketId) {
  const payload = await apiJson(ticketsUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const items = Array.isArray(payload?.body?.data)
    ? payload.body.data
    : Array.isArray(payload?.body)
      ? payload.body
      : [];
  return items.find((item) => item?.id === ticketId) || null;
}

async function createTicketViaUi(page, subject, content) {
  await page.goto(`${new URL(page.url()).origin}/user/dashboard/help`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[placeholder="What\'s it about?"], input[placeholder="Short subject"]').first().fill(subject);
  await page.locator('textarea[placeholder="Give us more details..."], textarea').first().fill(content);
  await page.getByRole('button', { name: /send message|create ticket/i }).click();
  await page.waitForFunction(
    () => Boolean(new URL(window.location.href).searchParams.get('ticket')),
    undefined,
    { timeout: 60000 },
  );
  await page.locator('body').filter({ hasText: subject }).first().waitFor({ timeout: 30000 });
  return {
    createResponse: {
      status: 200,
      body: 'ui-success',
    },
  };
}

async function apiJson(url, options) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await fetch(url, options);
    const bodyText = await response.text();
    let body = null;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText;
    }

    if (response.status === 429 && attempt < 11) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }

    if (!response.ok) {
      throw new Error(`${options.method || 'GET'} ${url} failed: ${response.status} ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    }
    return { status: response.status, body };
  }

  throw new Error(`${options.method || 'GET'} ${url} exhausted retries`);
}

function findTicketBySubject(payload, subject) {
  const items = Array.isArray(payload?.body?.data)
    ? payload.body.data
    : Array.isArray(payload?.body)
      ? payload.body
      : [];
  return items.find((item) => item?.subject === subject) || null;
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  await ensureReachable(getRoleBaseUrl(target, 'user'));
  await ensureReachable(getRoleBaseUrl(target, 'admin'));
  const artifactPath = buildArtifactPath(`support-lifecycle-${target.name}-proof.json`);
  const adminShot = buildArtifactPath(`support-lifecycle-${target.name}-admin.png`);
  const userShot = buildArtifactPath(`support-lifecycle-${target.name}-user.png`);
  const stamp = Date.now();
  const subject = `QA Support Lifecycle ${target.name} ${stamp}`;
  const userReply = `User support lifecycle verification for ${subject}`;
  const adminReply = `Admin reply for ${subject}`;

  const result = {
    scenario: `support-lifecycle-${target.name}`,
    target: target.name,
    baseUrl: target.baseUrl,
    subject,
    steps: [],
    artifacts: { artifactPath, adminShot, userShot },
    startedAt: new Date().toISOString(),
    status: 'running',
  };

  const browser = await chromium.launch({ headless: true });
  const userSession = await loginViaApi(target, 'user');
  const adminSession = await loginViaApi(target, 'admin');
  const userContext = await createAuthedContext(browser, userSession);
  const adminContext = await createAuthedContext(browser, adminSession);
  const userPage = await userContext.newPage();
  const adminPage = await adminContext.newPage();

  try {
    await userPage.goto(`${getRoleBaseUrl(target, 'user')}/user/dashboard`, { waitUntil: 'domcontentloaded' });
    await userPage.waitForURL((url) => url.pathname.startsWith(credentials.user.dashboard), { timeout: 30000 });
    result.steps.push({ name: 'user login', status: 'passed', url: userPage.url() });

    const { createResponse } = await createTicketViaUi(userPage, subject, userReply);
    result.createResponse = createResponse;
    const userToken = await userPage.evaluate(() => localStorage.getItem('esto_token'));
    const ticketsPayload = await apiJson(`${target.services.messaging}/api/v1/tickets`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const ticket = findTicketBySubject(ticketsPayload, subject);
    if (!ticket?.id || !ticket?.conversation_id) {
      throw new Error(`Unable to locate created ticket for subject ${subject}`);
    }
    result.ticket = { id: ticket.id, conversationId: ticket.conversation_id };
    result.steps.push({ name: 'user created ticket', status: 'passed', ticketId: ticket.id, conversationId: ticket.conversation_id });

    await adminPage.goto(`${getRoleBaseUrl(target, 'admin')}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
    await adminPage.waitForURL((url) => url.pathname.startsWith(credentials.admin.dashboard), { timeout: 30000 });
    result.steps.push({ name: 'admin login', status: 'passed', url: adminPage.url() });

    await adminPage.goto(`${getRoleBaseUrl(target, 'admin')}/admin/help?ticket=${ticket.id}`, { waitUntil: 'domcontentloaded' });
    await waitForHelpWorkspace(adminPage, ticket.id, subject);
    result.steps.push({ name: 'admin opened ticket', status: 'passed' });

    const adminToken = await adminPage.evaluate(() => localStorage.getItem('esto_token'));
    const headers = {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    };

    result.adminProgress = await apiJson(`${target.services.messaging}/api/v1/tickets/${ticket.id}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'in_progress' }),
    });
    result.steps.push({ name: 'admin marked in progress', status: 'passed' });

    result.adminReply = await apiJson(`${target.services.messaging}/api/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversation_id: ticket.conversation_id,
        content: adminReply,
        type: 'text',
        attachments: [],
      }),
    });
    result.steps.push({ name: 'admin replied', status: 'passed' });

    result.adminResolve = await apiJson(`${target.services.messaging}/api/v1/tickets/${ticket.id}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'resolved' }),
    });
    result.steps.push({ name: 'admin resolved ticket', status: 'passed' });

    await adminPage.reload({ waitUntil: 'domcontentloaded' });
    await adminPage.locator('p').filter({ hasText: adminReply }).last().waitFor({ timeout: 30000 });

    await userPage.goto(`${target.baseUrl}/user/dashboard/help?ticket=${ticket.id}`, { waitUntil: 'domcontentloaded' });
    await userPage.locator('p').filter({ hasText: adminReply }).last().waitFor({ timeout: 30000 });
    await userPage.getByRole('button', { name: /^Reopen$/i }).waitFor({ timeout: 30000 });
    result.steps.push({ name: 'user saw admin reply and resolved state', status: 'passed' });

    const userTicketsUrl = `${target.services.messaging}/api/v1/tickets`;
    await userPage.getByRole('button', { name: /^Reopen$/i }).click();
    await userPage.getByRole('button', { name: /^Reopen$/i }).waitFor({ state: 'hidden', timeout: 30000 });
    const reopenedTicket = await fetchTicketById(userTicketsUrl, userToken, ticket.id);
    if (!reopenedTicket || reopenedTicket.status !== 'open') {
      throw new Error(`Expected reopened ticket status to be open, got ${reopenedTicket?.status || 'missing'}`);
    }
    result.steps.push({ name: 'user reopened ticket', status: 'passed' });

    await userPage.getByRole('button', { name: /close ticket/i }).click();
    await userPage.getByRole('button', { name: /close ticket/i }).waitFor({ state: 'hidden', timeout: 30000 });
    const closedTicket = await fetchTicketById(userTicketsUrl, userToken, ticket.id);
    if (!closedTicket || closedTicket.status !== 'closed') {
      throw new Error(`Expected closed ticket status to be closed, got ${closedTicket?.status || 'missing'}`);
    }
    result.steps.push({ name: 'user closed ticket', status: 'passed' });

    await adminPage.screenshot({ path: adminShot, fullPage: true });
    await userPage.screenshot({ path: userShot, fullPage: true });
    result.status = 'passed';
    result.completedAt = new Date().toISOString();
  } catch (error) {
    result.status = 'failed';
    result.error = error.message;
    result.completedAt = new Date().toISOString();
    try { await adminPage.screenshot({ path: adminShot, fullPage: true }); } catch {}
    try { await userPage.screenshot({ path: userShot, fullPage: true }); } catch {}
    throw error;
  } finally {
    fs.writeFileSync(artifactPath, JSON.stringify(result, null, 2));
    await userContext.close();
    await adminContext.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
