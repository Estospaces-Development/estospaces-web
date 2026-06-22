const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  createAuthedContext,
  getRoleBaseUrl,
  loginViaApi,
  parseJson,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'admin-research-disposable-proof', runId);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function apiJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  return parseJson(response, options.label || `${options.method || 'GET'} ${url}`);
}

function attachDiagnostics(page, result) {
  page.on('pageerror', (error) => result.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      const text = message.text();
      if (!/^Failed to load resource:/i.test(text) && !/downloadable font/i.test(text)) {
        result.consoleMessages.push({ type: message.type(), text });
      }
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 500 && /estospaces|localhost|127\.0\.0\.1/i.test(response.url())) {
      result.networkErrors.push({ status: response.status(), url: response.url() });
    }
  });
}

function unwrapData(payload) {
  return payload?.data || payload || {};
}

function listItems(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

async function getSession(target, token, sessionId) {
  const payload = await apiJson(
    `${target.services.core}/api/v1/admin/research/sessions/${encodeURIComponent(sessionId)}`,
    token,
    { label: 'get research session' },
  );
  return unwrapData(payload);
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  ensureDir(outputDir);
  const stamp = Date.now();
  const reportPath = path.join(outputDir, 'admin-research-disposable-proof.json');
  const screenshotBeforeDelete = path.join(outputDir, 'admin-research-before-delete.png');
  const screenshotAfterDelete = path.join(outputDir, 'admin-research-after-delete.png');
  const result = {
    target: target.name,
    baseUrl: getRoleBaseUrl(target, 'admin'),
    startedAt: new Date().toISOString(),
    sessionId: '',
    sessionTitle: '',
    evidenceId: '',
    observationId: '',
    evidenceLabel: `QA disposable evidence ${stamp}`,
    observationNote: `Disposable admin observation proof ${stamp}`,
    createdEvidenceVisibleInApi: false,
    createdObservationVisibleInApi: false,
    createdEvidenceVisibleInUi: false,
    createdObservationVisibleInUi: false,
    deletedEvidenceAbsentInApi: false,
    deletedObservationAbsentInApi: false,
    deletedEvidenceAbsentInUi: false,
    deletedObservationAbsentInUi: false,
    screenshots: { beforeDelete: screenshotBeforeDelete, afterDelete: screenshotAfterDelete },
    pageErrors: [],
    consoleMessages: [],
    networkErrors: [],
    overallOk: false,
  };

  const adminSession = await loginViaApi(target, 'admin');
  const listPayload = await apiJson(`${target.services.core}/api/v1/admin/research/sessions`, adminSession.token, {
    label: 'list research sessions',
  });
  const sessions = listItems(listPayload?.data || listPayload);
  const session = sessions[0];
  if (!session?.id) {
    throw new Error('No admin research session is available for the disposable create-delete proof.');
  }
  result.sessionId = session.id;
  result.sessionTitle = session.title || session.id;

  const evidencePayload = await apiJson(
    `${target.services.core}/api/v1/admin/research/sessions/${encodeURIComponent(result.sessionId)}/evidence`,
    adminSession.token,
    {
      method: 'POST',
      label: 'create disposable research evidence',
      body: JSON.stringify({
        evidence_type: 'external_url',
        external_url: `${getRoleBaseUrl(target, 'admin')}/admin/research?qa=${stamp}`,
        label: result.evidenceLabel,
        notes: `Disposable admin evidence proof ${stamp}`,
      }),
    },
  );
  const evidence = unwrapData(evidencePayload);
  result.evidenceId = evidence.id || evidence.evidence_id || '';

  const observationPayload = await apiJson(
    `${target.services.core}/api/v1/admin/research/sessions/${encodeURIComponent(result.sessionId)}/observations`,
    adminSession.token,
    {
      method: 'POST',
      label: 'create disposable research observation',
      body: JSON.stringify({
        stage: 'Admin release proof',
        friction_tag: `qa-disposable-${stamp}`,
        severity: 'low',
        note: result.observationNote,
        drop_off_phrase: 'proof-only',
        recommended_action: 'Delete after verification.',
      }),
    },
  );
  const observation = unwrapData(observationPayload);
  result.observationId = observation.id || observation.observation_id || '';

  if (!result.evidenceId || !result.observationId) {
    throw new Error('Disposable research evidence or observation did not return an id.');
  }

  let sessionAfterCreate = await getSession(target, adminSession.token, result.sessionId);
  const evidenceItems = listItems(sessionAfterCreate.evidence);
  const observationItems = listItems(sessionAfterCreate.observations);
  result.createdEvidenceVisibleInApi = evidenceItems.some((item) => item.id === result.evidenceId);
  result.createdObservationVisibleInApi = observationItems.some((item) => item.id === result.observationId);

  const browser = await chromium.launch({ headless: true });
  const context = await createAuthedContext(browser, adminSession);
  const page = await context.newPage();
  attachDiagnostics(page, result);

  try {
    await page.goto(`${getRoleBaseUrl(target, 'admin')}/admin/research`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByText('Admin research workspace', { exact: false }).waitFor({ timeout: 60000 });
    const sessionButton = page.getByRole('button', { name: new RegExp(escapeRegExp(result.sessionTitle), 'i') }).first();
    if (await sessionButton.count()) {
      await sessionButton.click();
    }
    await page.getByText(result.evidenceLabel, { exact: false }).waitFor({ timeout: 60000 });
    await page.getByText(result.observationNote, { exact: false }).waitFor({ timeout: 60000 });
    result.createdEvidenceVisibleInUi = true;
    result.createdObservationVisibleInUi = true;
    await page.screenshot({ path: screenshotBeforeDelete, fullPage: true });

    await apiJson(
      `${target.services.core}/api/v1/admin/research/evidence/${encodeURIComponent(result.evidenceId)}`,
      adminSession.token,
      { method: 'DELETE', label: 'delete disposable research evidence' },
    );
    await apiJson(
      `${target.services.core}/api/v1/admin/research/observations/${encodeURIComponent(result.observationId)}`,
      adminSession.token,
      { method: 'DELETE', label: 'delete disposable research observation' },
    );

    sessionAfterCreate = await getSession(target, adminSession.token, result.sessionId);
    const evidenceAfterDelete = listItems(sessionAfterCreate.evidence);
    const observationsAfterDelete = listItems(sessionAfterCreate.observations);
    result.deletedEvidenceAbsentInApi = !evidenceAfterDelete.some((item) => item.id === result.evidenceId);
    result.deletedObservationAbsentInApi = !observationsAfterDelete.some((item) => item.id === result.observationId);

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByText('Admin research workspace', { exact: false }).waitFor({ timeout: 60000 });
    const reloadedSessionButton = page.getByRole('button', { name: new RegExp(escapeRegExp(result.sessionTitle), 'i') }).first();
    if (await reloadedSessionButton.count()) {
      await reloadedSessionButton.click();
    }
    await page.waitForTimeout(1500);
    result.deletedEvidenceAbsentInUi = (await page.getByText(result.evidenceLabel, { exact: false }).count()) === 0;
    result.deletedObservationAbsentInUi = (await page.getByText(result.observationNote, { exact: false }).count()) === 0;
    await page.screenshot({ path: screenshotAfterDelete, fullPage: true });
  } finally {
    await context.close();
    await browser.close();
  }

  result.completedAt = new Date().toISOString();
  result.overallOk = result.createdEvidenceVisibleInApi
    && result.createdObservationVisibleInApi
    && result.createdEvidenceVisibleInUi
    && result.createdObservationVisibleInUi
    && result.deletedEvidenceAbsentInApi
    && result.deletedObservationAbsentInApi
    && result.deletedEvidenceAbsentInUi
    && result.deletedObservationAbsentInUi
    && result.pageErrors.length === 0
    && result.consoleMessages.length === 0
    && result.networkErrors.length === 0;

  writeJson(reportPath, result);
  console.log(JSON.stringify({
    overallOk: result.overallOk,
    reportPath,
    sessionId: result.sessionId,
    evidenceId: result.evidenceId,
    observationId: result.observationId,
  }, null, 2));
  if (!result.overallOk) process.exitCode = 1;
}

main().catch((error) => {
  ensureDir(outputDir);
  writeJson(path.join(outputDir, 'admin-research-disposable-proof.error.json'), {
    error: error?.stack || String(error),
    completedAt: new Date().toISOString(),
  });
  console.error(error?.stack || error);
  process.exit(1);
});
