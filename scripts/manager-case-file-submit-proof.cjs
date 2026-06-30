const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const fallbackCredentialSource = path.join(__dirname, 'live-1000-catalog-proof.cjs');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'manager-case-file-submit-proof', runId);
const DEV_WEB_BASE_URL = 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';

function readEnvValueFromFile(filename, envKey) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [key, ...valueParts] = line.split('=');
    if (key === envKey) return valueParts.join('=').trim();
  }
  return '';
}

function resolveDevBaseUrl() {
  return (
    process.env.E2E_DEV_BASE_URL ||
    readEnvValueFromFile('.env.development', 'FRONTEND_URL') ||
    readEnvValueFromFile('.env.gcp-dev', 'FRONTEND_URL') ||
    DEV_WEB_BASE_URL
  ).replace(/\/$/, '');
}

function resolveDevServiceUrl(envKey, fallback) {
  const viteKey = envKey.replace(/^E2E_DEV_/, 'VITE_').replace(/_URL$/, '_SERVICE_URL');
  return (
    process.env[envKey] ||
    readEnvValueFromFile('.env.development', viteKey) ||
    readEnvValueFromFile('.env.gcp-dev', viteKey) ||
    fallback
  ).replace(/\/$/, '');
}

function fallbackCredential(roleName, fieldName) {
  if (!fs.existsSync(fallbackCredentialSource)) return '';
  const source = fs.readFileSync(fallbackCredentialSource, 'utf8');
  const blockMatch = source.match(new RegExp(`${roleName}:\\s*{([\\s\\S]*?)\\n\\s*}`, 'm'));
  if (!blockMatch) return '';
  const match = blockMatch[1].match(new RegExp(`${fieldName}:\\s*process\\.env\\.[A-Z0-9_]+\\s*\\|\\|\\s*'([^']+)'`));
  return match?.[1] || '';
}

function credential(roleName, fieldName, envName) {
  const value = process.env[envName] || fallbackCredential(roleName, fieldName);
  if (!value) throw new Error(`Missing credential value for ${roleName}.${fieldName}`);
  return value;
}

const target = {
  baseUrl: resolveDevBaseUrl(),
  coreUrl: resolveDevServiceUrl('E2E_DEV_CORE_URL', 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app'),
  bookingUrl: resolveDevServiceUrl('E2E_DEV_BOOKING_URL', 'https://estospaces-booking-service-dev-zaryfkxmeq-nw.a.run.app'),
};

const credentials = {
  user: {
    email: credential('user', 'email', 'E2E_USER_EMAIL'),
    password: credential('user', 'password', 'E2E_USER_PASSWORD'),
  },
  manager: {
    email: credential('manager', 'email', 'E2E_MANAGER_EMAIL'),
    password: credential('manager', 'password', 'E2E_MANAGER_PASSWORD'),
  },
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

async function parseJson(response, label) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${label} returned non-JSON: ${text}`);
  }
  if (!response.ok) {
    const detail = payload?.message || payload?.error || text || `status ${response.status}`;
    throw new Error(`${label} failed: ${detail}`);
  }
  return payload;
}

async function loginViaApi(roleName) {
  const response = await fetch(`${target.coreUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials[roleName]),
  });
  const payload = await parseJson(response, `${roleName} login`);
  const rawUser = payload?.data?.user ?? payload?.user;
  const token = payload?.data?.token ?? payload?.token;
  if (!token || !rawUser?.id) throw new Error(`${roleName} login did not return a usable token`);
  const fullName = [rawUser.first_name, rawUser.last_name].filter(Boolean).join(' ').trim() || rawUser.email || roleName;
  return {
    token,
    storedUser: {
      id: String(rawUser.id),
      email: String(rawUser.email || credentials[roleName].email),
      name: fullName,
      role: String(rawUser.role || roleName),
      isAuthenticated: true,
      first_name: rawUser.first_name || undefined,
      last_name: rawUser.last_name || undefined,
      user_metadata: {
        ...(typeof rawUser.metadata === 'object' && rawUser.metadata ? rawUser.metadata : {}),
        full_name: fullName,
      },
    },
  };
}

async function apiJson(baseUrl, pathname, session, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${session.token}`,
    },
  });
  return parseJson(response, `${options.method || 'GET'} ${pathname}`);
}

async function createAuthedContext(browser, session) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    ignoreHTTPSErrors: true,
  });
  await context.addInitScript(({ token, storedUser }) => {
    localStorage.setItem('esto_token', token);
    localStorage.setItem('esto_user', JSON.stringify(storedUser));
  }, session);
  return context;
}

function attachDiagnostics(page, result) {
  page.on('pageerror', (error) => result.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      result.consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 500 && /estospaces|localhost|127\.0\.0\.1/i.test(response.url())) {
      result.networkErrors.push({ status: response.status(), url: response.url() });
    }
  });
}

function createQaPdf(fileName) {
  const fixtureDir = path.join(outputDir, 'fixtures');
  ensureDir(fixtureDir);
  const filePath = path.join(fixtureDir, fileName);
  fs.writeFileSync(
    filePath,
    Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`),
  );
  return filePath;
}

async function findCaseDocument(caseId, fileName, session) {
  const payload = await apiJson(target.bookingUrl, `/api/v1/case-files/${encodeURIComponent(caseId)}`, session);
  const documents = payload?.data?.documents || payload?.documents || [];
  return documents.find((document) => (
    document.file_name === fileName ||
    document.fileName === fileName ||
    document.document?.file_name === fileName ||
    document.document?.fileName === fileName
  )) || null;
}

async function main() {
  ensureDir(outputDir);
  const stamp = Date.now();
  const fileName = `qa-manager-case-file-submit-${stamp}.pdf`;
  const filePath = createQaPdf(fileName);
  const result = {
    target,
    createdAt: new Date().toISOString(),
    outputDir,
    fileName,
    caseId: '',
    uploadedDocumentId: '',
    documentOwnerUserId: '',
    uiQueuedUploadVisible: false,
    uiUploadedStatusVisible: false,
    apiCaseFileDocumentVisible: false,
    cleanupStatus: 'not_started',
    screenshotAfterUpload: '',
    screenshotAfterCleanup: '',
    pageErrors: [],
    consoleMessages: [],
    networkErrors: [],
    overallOk: false,
  };

  const userSession = await loginViaApi('user');
  const managerSession = await loginViaApi('manager');
  const browser = await chromium.launch({ headless: true });
  const context = await createAuthedContext(browser, managerSession);
  const page = await context.newPage();
  attachDiagnostics(page, result);

  try {
    const candidateCaseId = '7c98138d-17c8-4a51-a685-0b4ee4077ba3';
    const candidatePayload = await apiJson(
      target.bookingUrl,
      `/api/v1/case-files/${encodeURIComponent(candidateCaseId)}`,
      managerSession,
    );
    const candidate = candidatePayload?.data || candidatePayload;
    if (candidate.user_id !== userSession.storedUser.id) {
      throw new Error('Manager case is not owned by the available QA user; refusing to upload a cleanup-sensitive test document.');
    }
    result.caseId = candidateCaseId;

    await page.goto(`${target.baseUrl}/manager/case-files?case=${encodeURIComponent(result.caseId)}&tab=documents&section=documents`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await page.getByText('Upload all documents', { exact: false }).first().waitFor({ timeout: 30000 });
    const input = page.locator('input[data-case-file-bulk-file-input="true"]');
    await input.waitFor({ timeout: 10000 });
    if (await input.isDisabled()) throw new Error('Manager case-file upload chooser is disabled.');
    await input.setInputFiles(filePath);
    await page.getByText(fileName, { exact: false }).first().waitFor({ timeout: 10000 });
    result.uiQueuedUploadVisible = true;
    await page.getByRole('button', { name: /Upload all documents/i }).click();
    await page.getByText(/1 file uploaded into the shared case file|Uploaded into the shared case file/i).first().waitFor({ timeout: 60000 });
    result.uiUploadedStatusVisible = true;
    result.screenshotAfterUpload = path.join(outputDir, 'manager-case-file-after-upload.png');
    await page.screenshot({ path: result.screenshotAfterUpload, fullPage: true });

    const uploaded = await findCaseDocument(result.caseId, fileName, managerSession);
    const uploadedDocumentId = uploaded?.document_id || uploaded?.document?.id || uploaded?.id;
    if (!uploadedDocumentId) throw new Error('Uploaded manager case-file QA document was not returned by API.');
    result.uploadedDocumentId = uploadedDocumentId;
    result.documentOwnerUserId = uploaded?.document?.user_id || uploaded?.user_id || '';
    result.apiCaseFileDocumentVisible = true;
    if (result.documentOwnerUserId !== userSession.storedUser.id) {
      throw new Error('Uploaded manager case-file document is not owned by the expected QA user; refusing cleanup.');
    }

    await apiJson(target.coreUrl, `/api/v1/documents/${encodeURIComponent(uploadedDocumentId)}`, userSession, { method: 'DELETE' });
    result.cleanupStatus = 'deleted';
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByText('Upload all documents', { exact: false }).first().waitFor({ timeout: 30000 });
    const remaining = await page.getByText(fileName, { exact: false }).count();
    if (remaining > 0) throw new Error('Deleted manager QA case-file document still appeared in UI after reload.');
    const stillInApi = await findCaseDocument(result.caseId, fileName, managerSession);
    if (stillInApi) throw new Error('Deleted manager QA case-file document still appeared in API after cleanup.');
    result.screenshotAfterCleanup = path.join(outputDir, 'manager-case-file-after-cleanup.png');
    await page.screenshot({ path: result.screenshotAfterCleanup, fullPage: true });

    if (result.pageErrors.length || result.consoleMessages.length || result.networkErrors.length) {
      throw new Error('Diagnostics contained page, console, or 5xx network errors.');
    }
    result.overallOk = true;
  } finally {
    await context.close();
    await browser.close();
  }

  const outputPath = path.join(outputDir, 'manager-case-file-submit-proof.json');
  writeJson(outputPath, result);
  console.log(JSON.stringify({
    overallOk: result.overallOk,
    outputPath,
    caseId: result.caseId,
    uploadedDocumentId: result.uploadedDocumentId,
    cleanupStatus: result.cleanupStatus,
    screenshotAfterUpload: result.screenshotAfterUpload,
    screenshotAfterCleanup: result.screenshotAfterCleanup,
  }, null, 2));
  if (!result.overallOk) process.exitCode = 1;
}

main().catch((error) => {
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, 'manager-case-file-submit-proof.error.json');
  writeJson(outputPath, {
    target,
    createdAt: new Date().toISOString(),
    error: error?.stack || String(error),
  });
  console.error(error?.stack || error);
  process.exit(1);
});
