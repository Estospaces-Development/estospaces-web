const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const fallbackCredentialSource = path.join(__dirname, 'live-1000-catalog-proof.cjs');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'manager-property-media-submit-proof', runId);
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
  mediaUrl: resolveDevServiceUrl('E2E_DEV_MEDIA_URL', 'https://estospaces-media-service-dev-zaryfkxmeq-nw.a.run.app'),
};

const credentials = {
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

async function loginViaApi() {
  const response = await fetch(`${target.coreUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials.manager),
  });
  const payload = await parseJson(response, 'manager login');
  const rawUser = payload?.data?.user ?? payload?.user;
  const token = payload?.data?.token ?? payload?.token;
  if (!token || !rawUser?.id) throw new Error('Manager login did not return a usable token');
  const fullName = [rawUser.first_name, rawUser.last_name].filter(Boolean).join(' ').trim() || rawUser.email || 'manager';
  return {
    token,
    storedUser: {
      id: String(rawUser.id),
      email: String(rawUser.email || credentials.manager.email),
      name: fullName,
      role: String(rawUser.role || 'manager'),
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

async function apiMaybeJson(baseUrl, pathname, session, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${session.token}`,
    },
  });
  if (response.status === 404) return { status: 404, payload: null };
  return { status: response.status, payload: await parseJson(response, `${options.method || 'GET'} ${pathname}`) };
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

function createQaPng(fileName) {
  const fixtureDir = path.join(outputDir, 'fixtures');
  ensureDir(fixtureDir);
  const filePath = path.join(fixtureDir, fileName);
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
  return filePath;
}

function unpackPropertyList(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.properties)) return data.properties;
  return [];
}

function unpackProperty(payload) {
  return payload?.data?.property ?? payload?.data ?? payload?.property ?? payload ?? null;
}

function unpackMediaList(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.files)) return data.files;
  if (Array.isArray(data?.media)) return data.media;
  return [];
}

function imageUrlsFor(property) {
  const raw = property?.image_urls ?? property?.imageUrls ?? property?.images ?? [];
  if (Array.isArray(raw)) return raw.filter((value) => typeof value === 'string');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((value) => typeof value === 'string');
    } catch {
      return raw.split(',').map((value) => value.trim()).filter(Boolean);
    }
  }
  return [];
}

async function findDraftPropertyByTitle(session, title) {
  const payload = await apiJson(
    target.coreUrl,
    `/api/v1/properties/mine?limit=20&status=draft&search=${encodeURIComponent(title)}`,
    session,
  );
  const properties = unpackPropertyList(payload);
  return properties.find((property) => property.title === title) || null;
}

async function findMediaByFileName(session, fileName) {
  const payload = await apiJson(target.mediaUrl, '/api/v1/media/mine?limit=100', session);
  const files = unpackMediaList(payload);
  return files.find((file) => file.original_name === fileName || file.file_name === fileName) || null;
}

async function main() {
  ensureDir(outputDir);
  const stamp = Date.now();
  const title = `QA media persistence draft ${stamp}`;
  const fileName = `qa-manager-property-media-${stamp}.png`;
  const filePath = createQaPng(fileName);
  const result = {
    target,
    createdAt: new Date().toISOString(),
    outputDir,
    title,
    fileName,
    propertyId: '',
    uploadedMediaId: '',
    uploadedMediaUrl: '',
    createdDraftViaUi: false,
    openedEditMediaStep: false,
    previewVisibleBeforeSave: false,
    mediaRecordVisible: false,
    propertyImageUrlVisible: false,
    cleanupStatus: 'not_started',
    screenshotAfterDraftCreate: '',
    screenshotAfterMediaSave: '',
    screenshotAfterCleanup: '',
    pageErrors: [],
    consoleMessages: [],
    networkErrors: [],
    overallOk: false,
  };

  const managerSession = await loginViaApi();
  const browser = await chromium.launch({ headless: true });
  const context = await createAuthedContext(browser, managerSession);
  const page = await context.newPage();
  attachDiagnostics(page, result);

  try {
    await page.goto(`${target.baseUrl}/manager/dashboard/properties/add`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Basic Property Information/i }).waitFor({ timeout: 20000 });
    await page.getByLabel(/Property Title/i).fill(title);
    await page.getByRole('button', { name: /^Save Draft$/i }).first().click();
    await page.getByText(/Property saved as draft successfully/i).waitFor({ timeout: 30000 });
    result.createdDraftViaUi = true;
    result.screenshotAfterDraftCreate = path.join(outputDir, 'after-draft-create.png');
    await page.screenshot({ path: result.screenshotAfterDraftCreate, fullPage: true });

    let draft = await findDraftPropertyByTitle(managerSession, title);
    if (!draft?.id) {
      await page.waitForTimeout(2000);
      draft = await findDraftPropertyByTitle(managerSession, title);
    }
    if (!draft?.id) throw new Error(`Created draft property not found by title: ${title}`);
    result.propertyId = String(draft.id);

    await page.goto(`${target.baseUrl}/manager/dashboard/properties/edit/${encodeURIComponent(result.propertyId)}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByRole('button', { name: /Media & Features/i }).click({ timeout: 30000 });
    await page.getByRole('heading', { name: /Property Images/i }).waitFor({ timeout: 15000 });
    result.openedEditMediaStep = true;
    await page.locator('#image-upload').setInputFiles(filePath);
    await page.getByAltText('Preview 1').waitFor({ timeout: 15000 });
    result.previewVisibleBeforeSave = true;
    await page.getByRole('button', { name: /^Save Draft$/i }).first().click();
    await page.getByText(/Property saved as draft successfully/i).waitFor({ timeout: 45000 });

    let mediaFile = await findMediaByFileName(managerSession, fileName);
    if (!mediaFile) {
      await page.waitForTimeout(3000);
      mediaFile = await findMediaByFileName(managerSession, fileName);
    }
    if (!mediaFile?.id) throw new Error(`Uploaded media record not found for ${fileName}`);
    result.uploadedMediaId = String(mediaFile.id);
    result.uploadedMediaUrl = String(mediaFile.file_url || '');
    result.mediaRecordVisible = String(mediaFile.entity_id || '') === result.propertyId;
    if (!result.mediaRecordVisible) {
      throw new Error(`Media record entity mismatch: expected ${result.propertyId}, got ${mediaFile.entity_id || '(empty)'}`);
    }

    const propertyPayload = await apiJson(target.coreUrl, `/api/v1/properties/${encodeURIComponent(result.propertyId)}`, managerSession);
    const property = unpackProperty(propertyPayload);
    const imageUrls = imageUrlsFor(property);
    result.propertyImageUrlVisible = imageUrls.some((url) => url === result.uploadedMediaUrl || url.includes(path.basename(result.uploadedMediaUrl)));
    if (!result.propertyImageUrlVisible) {
      throw new Error(`Property image_urls did not include uploaded media URL. URLs: ${JSON.stringify(imageUrls)}`);
    }

    result.screenshotAfterMediaSave = path.join(outputDir, 'after-media-save.png');
    await page.screenshot({ path: result.screenshotAfterMediaSave, fullPage: true });

    result.cleanupStatus = 'started';
    await apiMaybeJson(target.mediaUrl, `/api/v1/media/${encodeURIComponent(result.uploadedMediaId)}`, managerSession, { method: 'DELETE' });
    await apiMaybeJson(target.coreUrl, `/api/v1/properties/${encodeURIComponent(result.propertyId)}`, managerSession, { method: 'DELETE' });

    const mediaAfterCleanup = await findMediaByFileName(managerSession, fileName);
    const propertyAfterCleanup = await apiMaybeJson(
      target.coreUrl,
      `/api/v1/properties/${encodeURIComponent(result.propertyId)}`,
      managerSession,
    );
    if (mediaAfterCleanup || propertyAfterCleanup.status !== 404) {
      throw new Error(`Cleanup verification failed. media=${Boolean(mediaAfterCleanup)} propertyStatus=${propertyAfterCleanup.status}`);
    }
    result.cleanupStatus = 'verified';
    result.screenshotAfterCleanup = path.join(outputDir, 'after-cleanup.png');
    await page.goto(`${target.baseUrl}/manager/dashboard/properties`, { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: result.screenshotAfterCleanup, fullPage: true });

    result.overallOk =
      result.createdDraftViaUi &&
      result.openedEditMediaStep &&
      result.previewVisibleBeforeSave &&
      result.mediaRecordVisible &&
      result.propertyImageUrlVisible &&
      result.cleanupStatus === 'verified' &&
      result.pageErrors.length === 0 &&
      result.consoleMessages.length === 0 &&
      result.networkErrors.length === 0;

    if (!result.overallOk) {
      throw new Error(`Proof completed with diagnostics: ${JSON.stringify({
        pageErrors: result.pageErrors,
        consoleMessages: result.consoleMessages,
        networkErrors: result.networkErrors,
      })}`);
    }
  } finally {
    writeJson(path.join(outputDir, 'manager-property-media-submit-proof.json'), result);
    await context.close();
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  ensureDir(outputDir);
  writeJson(path.join(outputDir, 'manager-property-media-submit-proof-error.json'), {
    error: String(error?.stack || error),
    outputDir,
  });
  console.error(error);
  process.exitCode = 1;
});
