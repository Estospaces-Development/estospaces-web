const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  buildArtifactPath,
  ensureReachable,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

const credentials = {
  user: { email: 'user@gmail.com', password: 'Estospaces@123', dashboard: '/user/dashboard' },
  admin: { email: 'admin@estospaces.com', password: 'admin123', dashboard: '/admin/dashboard' },
};

async function login(page, baseUrl, role) {
  const { email, password, dashboard } = credentials[role];
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="email"], input[type="email"]').first().fill(email);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith(dashboard), { timeout: 30000 }),
    page.getByRole('button', { name: /^Sign In$/i }).click(),
  ]);
  await page.waitForTimeout(1200);
}

async function waitForTicketVisible(page, ticketId) {
  await page.waitForFunction((expectedId) => new URL(window.location.href).searchParams.get('ticket') === expectedId, ticketId, { timeout: 30000 });
}

function resolveTicketPayload(payload) {
  return payload?.data?.ticket
    || payload?.data
    || payload?.ticket
    || payload;
}

async function createTicketViaUi(page, subject, content) {
  await page.goto(`${new URL(page.url()).origin}/user/dashboard/help`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[placeholder="Short subject"]').fill(subject);
  await page.locator('textarea').first().fill(content);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const createPromise = page.waitForResponse(
      (response) => response.url().includes('/api/v1/tickets') && response.request().method() === 'POST',
      { timeout: 20000 },
    );
    await page.getByRole('button', { name: /create ticket/i }).click();
    const createResponse = await createPromise;
    const createPayload = await createResponse.json();

    if (createResponse.status() === 429 && attempt < 11) {
      await page.waitForTimeout(5000);
      continue;
    }

    const ticket = resolveTicketPayload(createPayload);
    if (!createResponse.ok || !ticket?.id) {
      throw new Error(`Ticket creation failed: ${createResponse.status()} ${JSON.stringify(createPayload)}`);
    }

    return {
      ticket,
      createResponse: {
        status: createResponse.status(),
        body: JSON.stringify(createPayload),
      },
    };
  }

  throw new Error('Ticket creation exhausted retries');
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

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  await ensureReachable(target.baseUrl);
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
  const userContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const userPage = await userContext.newPage();
  const adminPage = await adminContext.newPage();

  try {
    await login(userPage, target.baseUrl, 'user');
    result.steps.push({ name: 'user login', status: 'passed', url: userPage.url() });

    const { ticket, createResponse } = await createTicketViaUi(userPage, subject, userReply);
    result.createResponse = createResponse;
    result.ticket = { id: ticket.id, conversationId: ticket.conversation_id };
    await waitForTicketVisible(userPage, ticket.id);
    result.steps.push({ name: 'user created ticket', status: 'passed', ticketId: ticket.id, conversationId: ticket.conversation_id });

    await login(adminPage, target.baseUrl, 'admin');
    result.steps.push({ name: 'admin login', status: 'passed', url: adminPage.url() });

    await adminPage.goto(`${target.baseUrl}/admin/help`, { waitUntil: 'domcontentloaded' });
    const unassigned = adminPage.getByRole('button', { name: 'Unassigned' });
    if (await unassigned.count()) {
      await unassigned.click();
    }
    await adminPage.getByRole('button', { name: subject }).click({ timeout: 30000 });
    await waitForTicketVisible(adminPage, ticket.id);
    result.steps.push({ name: 'admin opened ticket', status: 'passed' });

    const adminToken = await adminPage.evaluate(() => localStorage.getItem('esto_token'));
    const meResponse = await apiJson(`${target.services.core}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminId = meResponse.body?.data?.id || meResponse.body?.data?.user?.id;
    if (!adminId) {
      throw new Error('Unable to resolve admin id from auth/me');
    }

    const headers = {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    };

    result.adminAssign = await apiJson(`${target.services.messaging}/api/v1/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ assignee_id: adminId }),
    });
    result.steps.push({ name: 'admin assigned ticket', status: 'passed' });

    result.adminProgress = await apiJson(`${target.services.messaging}/api/v1/tickets/${ticket.id}`, {
      method: 'PATCH',
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

    result.adminResolve = await apiJson(`${target.services.messaging}/api/v1/tickets/${ticket.id}`, {
      method: 'PATCH',
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

    const reopenPromise = userPage.waitForResponse(
      (response) => response.url().includes(`/api/v1/tickets/${ticket.id}`) && response.request().method() === 'PATCH',
      { timeout: 20000 },
    );
    await userPage.getByRole('button', { name: /^Reopen$/i }).click();
    await reopenPromise;
    result.steps.push({ name: 'user reopened ticket', status: 'passed' });

    const closePromise = userPage.waitForResponse(
      (response) => response.url().includes(`/api/v1/tickets/${ticket.id}`) && response.request().method() === 'PATCH',
      { timeout: 20000 },
    );
    await userPage.getByRole('button', { name: /close ticket/i }).click();
    await closePromise;
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
