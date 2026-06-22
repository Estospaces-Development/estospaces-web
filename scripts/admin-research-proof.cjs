const fs = require('node:fs');
const { chromium } = require('playwright');
const {
  buildArtifactPath,
  createAuthedContext,
  ensureReachable,
  getRoleBaseUrl,
  loginViaApi,
  parseJson,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

async function apiJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return parseJson(response, options.label || url);
}

async function createSession(target, token, payload) {
  const response = await apiJson(`${target.services.core}/api/v1/admin/research/sessions`, token, {
    method: 'POST',
    label: `create research ${payload.track}`,
    body: JSON.stringify(payload),
  });
  return response.data;
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  await ensureReachable(getRoleBaseUrl(target, 'admin'));
  const artifactPath = buildArtifactPath(`admin-research-${target.name}-proof.json`);
  const adminShot = buildArtifactPath(`admin-research-${target.name}.png`);
  const userDeniedShot = buildArtifactPath(`admin-research-${target.name}-user-denied.png`);
  fs.mkdirSync(require('node:path').dirname(artifactPath), { recursive: true });

  const stamp = Date.now();
  const result = {
    scenario: `admin-research-${target.name}`,
    target: target.name,
    steps: [],
    artifacts: { artifactPath, adminShot, userDeniedShot },
    startedAt: new Date().toISOString(),
    status: 'running',
  };

  const adminSession = await loginViaApi(target, 'admin');
  const userSession = await loginViaApi(target, 'user');
  const browser = await chromium.launch({ headless: true });
  const adminContext = await createAuthedContext(browser, adminSession);
  const userContext = await createAuthedContext(browser, userSession);
  const page = await adminContext.newPage();
  const userPage = await userContext.newPage();

  try {
    const inApp = await createSession(target, adminSession.token, {
      track: 'in_app_journey',
      title: `QA In-App Journey ${stamp}`,
      participant_role: 'user',
      summary: 'Browser proof seeker journey session.',
    });
    const broker = await createSession(target, adminSession.token, {
      track: 'broker_console',
      title: `QA Broker Console ${stamp}`,
      status: 'in_progress',
      participant_role: 'manager',
      summary: 'Browser proof broker console session.',
    });
    const callChat = await createSession(target, adminSession.token, {
      track: 'call_chat_review',
      title: `QA Call Chat Review ${stamp}`,
      status: 'in_progress',
      participant_role: 'user',
      summary: 'Browser proof call chat session.',
    });
    result.sessions = { inApp: inApp.id, broker: broker.id, callChat: callChat.id };
    result.steps.push({ name: 'created sessions through admin API', status: 'passed' });

    await apiJson(`${target.services.core}/api/v1/admin/research/sessions/${broker.id}/evidence`, adminSession.token, {
      method: 'POST',
      label: 'add broker evidence',
      body: JSON.stringify({
        evidence_type: 'fast_track_case',
        reference_id: `case-${stamp}`,
        label: 'Fast-track case evidence',
      }),
    });
    await apiJson(`${target.services.core}/api/v1/admin/research/sessions/${broker.id}/observations`, adminSession.token, {
      method: 'POST',
      label: 'add broker observation',
      body: JSON.stringify({
        stage: 'Notifications',
        friction_tag: `sla timer proof ${stamp}`,
        severity: 'high',
        note: 'Broker hesitated because SLA timer behavior was unclear.',
        drop_off_phrase: 'I will come back to this later',
        recommended_action: 'Clarify SLA state next to response actions.',
      }),
    });
    result.steps.push({ name: 'created linked evidence and observation', status: 'passed' });

    await page.goto(`${getRoleBaseUrl(target, 'admin')}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Observational Research', { exact: true }).first().click();
    await page.waitForURL((url) => url.pathname === '/admin/research', { timeout: 30000 });
    await page.getByRole('button', { name: new RegExp(`QA In-App Journey ${stamp}`) }).waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: new RegExp(`QA Broker Console ${stamp}`) }).waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: new RegExp(`QA Call Chat Review ${stamp}`) }).waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: new RegExp(`QA Broker Console ${stamp}`) }).click();
    await page.getByText(`sla timer proof ${stamp}`, { exact: true }).waitFor({ timeout: 30000 });
    result.steps.push({ name: 'admin dashboard navigates to research workspace', status: 'passed' });

    await page.getByRole('button', { name: new RegExp(`QA Call Chat Review ${stamp}`) }).click();
    const reviewButton = page.getByRole('button', { name: /^Mark reviewed$/i });
    await reviewButton.waitFor({ timeout: 30000 });
    if (!(await reviewButton.isDisabled())) {
      throw new Error('Expected Mark reviewed to be disabled before call/chat consent');
    }
    await page.getByLabel(/Consent confirmed/i).check();
    await page.getByPlaceholder(/Consent note/i).fill(`Consent captured in proof ticket ${stamp}.`);
    await page.getByRole('button', { name: /^Save consent$/i }).click();
    await page.getByText(/Consent state updated/i).waitFor({ timeout: 30000 }).catch(() => {});
    await page.getByRole('button', { name: /^Mark reviewed$/i }).click();
    await page.getByText(/Research session status updated/i).waitFor({ timeout: 30000 }).catch(() => {});
    await page.getByText('Reviewed').first().waitFor({ timeout: 30000 });
    result.steps.push({ name: 'call chat consent gate blocks then allows review', status: 'passed' });

    await userPage.goto(`${getRoleBaseUrl(target, 'user')}/admin/research`, { waitUntil: 'domcontentloaded' });
    await userPage.waitForTimeout(1500);
    if (await userPage.getByText('Admin research workspace').count()) {
      throw new Error('Non-admin user could access admin research workspace');
    }
    result.steps.push({ name: 'non-admin denied admin research workspace', status: 'passed', url: userPage.url() });

    await page.screenshot({ path: adminShot, fullPage: true });
    await userPage.screenshot({ path: userDeniedShot, fullPage: true });
    result.status = 'passed';
    result.completedAt = new Date().toISOString();
  } catch (error) {
    result.status = 'failed';
    result.error = error.message;
    result.completedAt = new Date().toISOString();
    try { await page.screenshot({ path: adminShot, fullPage: true }); } catch {}
    try { await userPage.screenshot({ path: userDeniedShot, fullPage: true }); } catch {}
    throw error;
  } finally {
    fs.writeFileSync(artifactPath, JSON.stringify(result, null, 2));
    await adminContext.close();
    await userContext.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
