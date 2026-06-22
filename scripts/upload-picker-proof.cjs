const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const fallbackCredentialSource = path.join(__dirname, 'live-1000-catalog-proof.cjs');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'upload-picker-proof', runId);

function readEnvValueFromFile(filename, envKey) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    return '';
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const [key, ...valueParts] = line.split('=');
    if (key === envKey) {
      return valueParts.join('=').trim();
    }
  }
  return '';
}

function resolveDevBaseUrl() {
  return (
    process.env.E2E_DEV_BASE_URL ||
    readEnvValueFromFile('.env.development', 'FRONTEND_URL') ||
    readEnvValueFromFile('.env.gcp-dev', 'FRONTEND_URL') ||
    'http://localhost:3000'
  );
}

function resolveDevServiceUrl(envKey, fallback) {
  return (
    process.env[envKey] ||
    readEnvValueFromFile('.env.development', envKey.replace(/^E2E_DEV_/, 'VITE_').replace(/_URL$/, '_SERVICE_URL')) ||
    readEnvValueFromFile('.env.gcp-dev', envKey.replace(/^E2E_DEV_/, 'VITE_').replace(/_URL$/, '_SERVICE_URL')) ||
    fallback
  );
}

function fallbackCredential(roleName, fieldName) {
  if (!fs.existsSync(fallbackCredentialSource)) {
    return '';
  }
  const source = fs.readFileSync(fallbackCredentialSource, 'utf8');
  const blockMatch = source.match(new RegExp(`${roleName}:\\s*{([\\s\\S]*?)\\n\\s*}`, 'm'));
  if (!blockMatch) {
    return '';
  }
  const match = blockMatch[1].match(new RegExp(`${fieldName}:\\s*process\\.env\\.[A-Z0-9_]+\\s*\\|\\|\\s*'([^']+)'`));
  return match?.[1] || '';
}

function credential(roleName, fieldName, envName) {
  const value = process.env[envName] || fallbackCredential(roleName, fieldName);
  if (!value) {
    throw new Error(`Missing credential value for ${roleName}.${fieldName}`);
  }
  return value;
}

const target = {
  baseUrl: resolveDevBaseUrl().replace(/\/$/, ''),
  coreUrl: resolveDevServiceUrl('E2E_DEV_CORE_URL', 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app').replace(/\/$/, ''),
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
    throw new Error(`${label} returned non-JSON`);
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.error || `status ${response.status}`;
    throw new Error(`${label} failed: ${detail}`);
  }
  return payload;
}

async function loginViaApi(roleName) {
  const loginResponse = await fetch(`${target.coreUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials[roleName]),
  });
  const payload = await parseJson(loginResponse, `${roleName} login`);
  const rawUser = payload?.data?.user ?? payload?.user;
  const token = payload?.data?.token ?? payload?.token;
  if (!token || !rawUser?.id) {
    throw new Error(`${roleName} login did not return a usable token`);
  }
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
      avatar_url: rawUser.avatar || rawUser.avatar_url || undefined,
      avatar: rawUser.avatar || rawUser.avatar_url || undefined,
      user_metadata: {
        ...(typeof rawUser.metadata === 'object' && rawUser.metadata ? rawUser.metadata : {}),
        full_name: fullName,
      },
    },
  };
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

function attachDiagnostics(page, bucket) {
  page.on('pageerror', (error) => {
    bucket.pageErrors.push(String(error));
  });
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      bucket.consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 500 && /estospaces|localhost|127\.0\.0\.1/i.test(response.url())) {
      bucket.networkErrors.push({ status: response.status(), url: response.url() });
    }
  });
}

function createFixtureFiles() {
  const fixtureDir = path.join(outputDir, 'fixtures');
  ensureDir(fixtureDir);
  const pdfPath = path.join(fixtureDir, 'qa-upload-proof.pdf');
  const pngPath = path.join(fixtureDir, 'qa-image-proof.png');
  const txtPath = path.join(fixtureDir, 'qa-upload-invalid.txt');

  fs.writeFileSync(
    pdfPath,
    Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n'),
  );
  fs.writeFileSync(
    pngPath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  fs.writeFileSync(txtPath, 'Invalid upload fixture for UI validation only.\n');
  return { pdfPath, pngPath, txtPath };
}

async function screenshot(page, name) {
  const filePath = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function assertHealthy(page, expectedText) {
  await page.getByText(expectedText, { exact: false }).first().waitFor({ timeout: 30000 });
  const bodyText = await page.locator('body').innerText({ timeout: 10000 });
  if (/unexpected application error|something went wrong|temporary service issue/i.test(bodyText)) {
    throw new Error(`Unhealthy page state while looking for ${expectedText}`);
  }
}

async function verifyVirtualStorage(browser, session, files) {
  const result = {
    name: 'user virtual storage file chooser',
    status: 'failed',
    selectedFileName: '',
    uploadDisabledBeforeSelection: null,
    uploadDisabledAfterSelection: null,
    uploadDisabledAfterClear: null,
    screenshot: '',
    pageErrors: [],
    consoleMessages: [],
    networkErrors: [],
  };
  const context = await createAuthedContext(browser, session);
  const page = await context.newPage();
  attachDiagnostics(page, result);
  try {
    await page.goto(`${target.baseUrl}/user/virtual-storage`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await assertHealthy(page, 'Virtual Storage');
    const uploadButton = page.getByRole('button', { name: /^Upload$/ }).first();
    result.uploadDisabledBeforeSelection = await uploadButton.isDisabled();

    const input = page.locator('#virtual-storage-file');
    await input.setInputFiles(files.pdfPath);
    result.selectedFileName = await input.evaluate((element) => element.files?.[0]?.name || '');
    result.uploadDisabledAfterSelection = await uploadButton.isDisabled();

    await input.setInputFiles([]);
    result.uploadDisabledAfterClear = await uploadButton.isDisabled();
    result.screenshot = await screenshot(page, 'user-virtual-storage-picker');

    if (result.uploadDisabledBeforeSelection !== true) {
      throw new Error('Upload button was not disabled before selecting a file.');
    }
    if (result.selectedFileName !== 'qa-upload-proof.pdf') {
      throw new Error(`Unexpected selected file: ${result.selectedFileName}`);
    }
    if (result.uploadDisabledAfterSelection !== false) {
      throw new Error('Upload button did not enable after selecting a file.');
    }
    if (result.uploadDisabledAfterClear !== true) {
      throw new Error('Upload button did not disable after clearing the selected file.');
    }
    result.status = 'passed';
  } finally {
    await context.close();
  }
  return result;
}

async function collectFastTrackCaseIds(page, route) {
  await page.goto(`${target.baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-fast-track-case-card]').first().waitFor({ timeout: 30000 });
  const cards = page.locator('[data-fast-track-case-card]');
  const count = await cards.count();
  const caseIds = [];
  for (let index = 0; index < Math.min(count, 12); index += 1) {
    const caseId = await cards.nth(index).getAttribute('data-fast-track-case-card');
    if (caseId && !caseIds.includes(caseId)) {
      caseIds.push(caseId);
    }
  }
  return caseIds;
}

async function verifyCaseFileQueue(browser, roleName, session, files) {
  const routeByRole = {
    user: '/user/dashboard/case-file',
    manager: '/manager/case-files',
  };
  const fastTrackRouteByRole = {
    user: '/user/dashboard/fast-track',
    manager: '/manager/fast-track',
  };
  const result = {
    name: `${roleName} case-file bulk upload queue`,
    status: 'failed',
    caseId: '',
    queuedFileVisible: false,
    uploadButtonDisabledAfterQueue: null,
    queueCleared: false,
    screenshot: '',
    pageErrors: [],
    consoleMessages: [],
    networkErrors: [],
  };
  const context = await createAuthedContext(browser, session);
  const page = await context.newPage();
  attachDiagnostics(page, result);
  try {
    const caseIds = await collectFastTrackCaseIds(page, fastTrackRouteByRole[roleName]);
    for (const caseId of caseIds) {
      await page.goto(`${target.baseUrl}${routeByRole[roleName]}?case=${encodeURIComponent(caseId)}&tab=documents&section=documents`, {
        waitUntil: 'domcontentloaded',
        timeout: 120000,
      });
      try {
        await assertHealthy(page, 'Upload all documents');
        const input = page.locator('input[data-case-file-bulk-file-input="true"]');
        await input.waitFor({ timeout: 10000 });
        if (await input.isDisabled()) {
          continue;
        }
        result.caseId = caseId;
        await input.setInputFiles(files.pdfPath);
        await page.getByText('qa-upload-proof.pdf').first().waitFor({ timeout: 10000 });
        result.queuedFileVisible = true;
        const uploadButton = page.getByRole('button', { name: /Upload all documents/i }).first();
        result.uploadButtonDisabledAfterQueue = await uploadButton.isDisabled();
        result.screenshot = await screenshot(page, `${roleName}-case-file-queue`);
        await page.getByRole('button', { name: /Clear queue/i }).click();
        await page.getByText('qa-upload-proof.pdf').first().waitFor({ state: 'detached', timeout: 10000 }).catch(async () => {
          const count = await page.getByText('qa-upload-proof.pdf').count();
          if (count > 0) {
            throw new Error('Queued file remained visible after clearing.');
          }
        });
        result.queueCleared = true;
        break;
      } catch (error) {
        if (caseId === caseIds[caseIds.length - 1]) {
          throw error;
        }
      }
    }

    if (!result.caseId) {
      throw new Error(`No ${roleName} case file with an enabled bulk chooser was found.`);
    }
    if (!result.queuedFileVisible) {
      throw new Error('Queued file name did not appear.');
    }
    if (result.uploadButtonDisabledAfterQueue !== false) {
      throw new Error('Upload all documents button did not enable after queueing a file.');
    }
    if (!result.queueCleared) {
      throw new Error('Queue did not clear.');
    }
    result.status = 'passed';
  } finally {
    await context.close();
  }
  return result;
}

async function getManagerPropertyId(session) {
  const response = await fetch(`${target.coreUrl}/api/v1/properties/mine?limit=5`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  const payload = await parseJson(response, 'manager properties');
  const properties = payload?.data?.data || payload?.data || [];
  const property = Array.isArray(properties) ? properties.find((item) => item?.id) : null;
  return property?.id || '';
}

async function verifyManagerPropertyMedia(browser, session, files) {
  const result = {
    name: 'manager property media staging',
    status: 'failed',
    propertyId: '',
    imagePreviewVisible: false,
    invalidFormatMessageVisible: false,
    virtualTourTextCount: 0,
    screenshot: '',
    pageErrors: [],
    consoleMessages: [],
    networkErrors: [],
  };
  const propertyId = await getManagerPropertyId(session);
  result.propertyId = propertyId;
  if (!propertyId) {
    throw new Error('No manager property id available for media staging proof.');
  }

  const context = await createAuthedContext(browser, session);
  const page = await context.newPage();
  attachDiagnostics(page, result);
  try {
    await page.goto(`${target.baseUrl}/manager/dashboard/properties/edit/${encodeURIComponent(propertyId)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await assertHealthy(page, 'Basic Info');
    await page.getByRole('button', { name: /Media & Features/i }).click();
    await assertHealthy(page, 'Property Images');

    const imageInput = page.locator('#image-upload');
    await imageInput.setInputFiles(files.pngPath);
    await page.locator('img[alt="Preview 1"]').waitFor({ timeout: 10000 });
    result.imagePreviewVisible = true;
    result.virtualTourTextCount = await page.getByText(/virtual tour|3d|matterport/i).count();

    await page.getByRole('button', { name: /Remove property image 1/i }).click();
    await imageInput.setInputFiles(files.txtPath);
    await page.getByText(/unsupported format/i).first().waitFor({ timeout: 10000 });
    result.invalidFormatMessageVisible = true;
    result.screenshot = await screenshot(page, 'manager-property-media-staging');

    if (result.virtualTourTextCount !== 0) {
      throw new Error(`Out-of-scope media text was visible ${result.virtualTourTextCount} time(s).`);
    }
    result.status = 'passed';
  } finally {
    await context.close();
  }
  return result;
}

async function main() {
  ensureDir(outputDir);
  const files = createFixtureFiles();
  const result = {
    target,
    outputDir,
    createdAt: new Date().toISOString(),
    note: 'No upload submit/save buttons were clicked. This proof verifies file-picker, queue, preview, validation, and clear/remove states only.',
    checks: [],
    overallOk: false,
  };

  const browser = await chromium.launch({ headless: true });
  try {
    const userSession = await loginViaApi('user');
    const managerSession = await loginViaApi('manager');

    result.checks.push(await verifyVirtualStorage(browser, userSession, files));
    result.checks.push(await verifyCaseFileQueue(browser, 'user', userSession, files));
    result.checks.push(await verifyCaseFileQueue(browser, 'manager', managerSession, files));
    result.checks.push(await verifyManagerPropertyMedia(browser, managerSession, files));

    result.overallOk = result.checks.every((check) => check.status === 'passed');
  } finally {
    await browser.close();
  }

  const outputPath = path.join(outputDir, 'upload-picker-proof.json');
  writeJson(outputPath, result);
  console.log(JSON.stringify({
    overallOk: result.overallOk,
    outputPath,
    checks: result.checks.map((check) => ({
      name: check.name,
      status: check.status,
      screenshot: check.screenshot,
    })),
  }, null, 2));

  if (!result.overallOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, 'upload-picker-proof.error.json');
  writeJson(outputPath, {
    target,
    createdAt: new Date().toISOString(),
    error: error?.stack || String(error),
  });
  console.error(error?.stack || error);
  process.exit(1);
});
