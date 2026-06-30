const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const fallbackCredentialSource = path.join(__dirname, 'live-1000-catalog-proof.cjs');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'support-attachment-submit-proof', runId);
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
  messagingUrl: resolveDevServiceUrl('E2E_DEV_MESSAGING_URL', 'https://estospaces-messaging-service-dev-zaryfkxmeq-nw.a.run.app'),
  mediaUrl: resolveDevServiceUrl('E2E_DEV_MEDIA_URL', 'https://estospaces-media-service-dev-zaryfkxmeq-nw.a.run.app'),
};

const credentials = {
  user: {
    email: credential('user', 'email', 'E2E_USER_EMAIL'),
    password: credential('user', 'password', 'E2E_USER_PASSWORD'),
  },
  admin: {
    email: credential('admin', 'email', 'E2E_ADMIN_EMAIL'),
    password: credential('admin', 'password', 'E2E_ADMIN_PASSWORD'),
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

function attachDiagnostics(page, result, prefix) {
  page.on('pageerror', (error) => result.pageErrors.push({ page: prefix, error: String(error) }));
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      result.consoleMessages.push({ page: prefix, type: message.type(), text: message.text() });
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 500 && /estospaces|localhost|127\.0\.0\.1/i.test(response.url())) {
      result.networkErrors.push({ page: prefix, status: response.status(), url: response.url() });
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

function unpackTicket(payload) {
  return payload?.data?.ticket ?? payload?.data ?? payload?.ticket ?? payload ?? null;
}

function unpackMessages(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages)) return data.messages;
  return [];
}

function unpackMediaList(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.files)) return data.files;
  if (Array.isArray(data?.media)) return data.media;
  return [];
}

async function findMediaByFileName(session, fileName) {
  const payload = await apiJson(target.mediaUrl, '/api/v1/media/mine?limit=100', session);
  const files = unpackMediaList(payload);
  return files.find((file) => file.original_name === fileName || file.file_name === fileName) || null;
}

async function main() {
  ensureDir(outputDir);
  const stamp = Date.now();
  const subject = `QA support attachment persistence ${stamp}`;
  const message = `Support attachment persistence proof for ${subject}`;
  const fileName = `qa-support-attachment-${stamp}.pdf`;
  const filePath = createQaPdf(fileName);
  const result = {
    target,
    createdAt: new Date().toISOString(),
    outputDir,
    subject,
    fileName,
    ticketId: '',
    conversationId: '',
    messageAttachmentId: '',
    uploadedMediaId: '',
    mediaEntityType: '',
    mediaEntityId: '',
    userComposerAttachmentVisible: false,
    userTranscriptAttachmentVisible: false,
    adminTranscriptAttachmentVisible: false,
    apiMessageAttachmentVisible: false,
    attachmentAccessUrlAvailable: false,
    mediaRecordReassignedToTicket: false,
    ticketClosed: false,
    mediaCleanupStatus: 'not_started',
    screenshotUserTicket: '',
    screenshotAdminTicket: '',
    screenshotAfterCleanup: '',
    pageErrors: [],
    consoleMessages: [],
    networkErrors: [],
    overallOk: false,
  };

  const userSession = await loginViaApi('user');
  const adminSession = await loginViaApi('admin');
  const browser = await chromium.launch({ headless: true });
  const userContext = await createAuthedContext(browser, userSession);
  const adminContext = await createAuthedContext(browser, adminSession);
  const userPage = await userContext.newPage();
  const adminPage = await adminContext.newPage();
  attachDiagnostics(userPage, result, 'user');
  attachDiagnostics(adminPage, result, 'admin');

  try {
    await userPage.goto(`${target.baseUrl}/user/dashboard/help`, { waitUntil: 'domcontentloaded' });
    await userPage.getByRole('heading', { name: /Open a support ticket/i }).waitFor({ timeout: 30000 });
    await userPage.getByLabel(/Support ticket subject/i).fill(subject);
    await userPage.getByLabel(/Describe the blocker/i).fill(message);
    await userPage.locator('input[name="support-attachments"]').setInputFiles(filePath);
    await userPage.getByText(fileName).waitFor({ timeout: 30000 });
    result.userComposerAttachmentVisible = true;
    await userPage.getByRole('button', { name: /Create ticket/i }).click();
    await userPage.waitForFunction(
      () => Boolean(new URL(window.location.href).searchParams.get('ticket')),
      undefined,
      { timeout: 60000 },
    );
    result.ticketId = await userPage.evaluate(() => new URL(window.location.href).searchParams.get('ticket') || '');
    result.conversationId = await userPage.evaluate(() => new URL(window.location.href).searchParams.get('conversation') || '');
    if (!result.ticketId || !result.conversationId) {
      throw new Error(`Ticket URL params missing. ticket=${result.ticketId} conversation=${result.conversationId}`);
    }
    await userPage.getByText(fileName).waitFor({ timeout: 30000 });
    result.userTranscriptAttachmentVisible = true;
    result.screenshotUserTicket = path.join(outputDir, 'user-ticket-with-attachment.png');
    await userPage.screenshot({ path: result.screenshotUserTicket, fullPage: true });

    const messagesPayload = await apiJson(
      target.messagingUrl,
      `/api/v1/conversations/${encodeURIComponent(result.conversationId)}/messages?page=1&limit=50`,
      userSession,
    );
    const messages = unpackMessages(messagesPayload);
    const messageWithAttachment = messages.find((item) => (
      Array.isArray(item.attachments) &&
      item.attachments.some((attachment) => attachment.file_name === fileName)
    ));
    const apiAttachment = messageWithAttachment?.attachments?.find((attachment) => attachment.file_name === fileName);
    if (!apiAttachment?.id) {
      throw new Error(`Support message attachment not found in API transcript for ${fileName}`);
    }
    result.messageAttachmentId = String(apiAttachment.id);
    result.apiMessageAttachmentVisible = true;

    const accessPayload = await apiJson(
      target.messagingUrl,
      `/api/v1/support/attachments/${encodeURIComponent(result.messageAttachmentId)}/access-url`,
      userSession,
    );
    result.attachmentAccessUrlAvailable = Boolean(accessPayload?.data?.access_url || accessPayload?.access_url);
    if (!result.attachmentAccessUrlAvailable) {
      throw new Error(`Support attachment access URL was not available for ${result.messageAttachmentId}`);
    }

    let mediaFile = await findMediaByFileName(userSession, fileName);
    if (!mediaFile) {
      await userPage.waitForTimeout(2000);
      mediaFile = await findMediaByFileName(userSession, fileName);
    }
    if (!mediaFile?.id) throw new Error(`Support media record not found for ${fileName}`);
    result.uploadedMediaId = String(mediaFile.id || '');
    result.mediaEntityType = String(mediaFile.entity_type || '');
    result.mediaEntityId = String(mediaFile.entity_id || '');
    result.mediaRecordReassignedToTicket =
      result.mediaEntityType === 'support_ticket' &&
      result.mediaEntityId === result.ticketId;
    if (!result.mediaRecordReassignedToTicket) {
      throw new Error(`Support media was not reassigned to ticket. media=${JSON.stringify(mediaFile)}`);
    }

    await adminPage.goto(
      `${target.baseUrl}/admin/help?ticket=${encodeURIComponent(result.ticketId)}&conversation=${encodeURIComponent(result.conversationId)}`,
      { waitUntil: 'domcontentloaded' },
    );
    await adminPage.getByRole('heading', { name: subject }).waitFor({ timeout: 30000 });
    await adminPage.getByText(fileName).waitFor({ timeout: 30000 });
    result.adminTranscriptAttachmentVisible = true;
    result.screenshotAdminTicket = path.join(outputDir, 'admin-ticket-with-attachment.png');
    await adminPage.screenshot({ path: result.screenshotAdminTicket, fullPage: true });

    const closedPayload = await apiJson(
      target.messagingUrl,
      `/api/v1/tickets/${encodeURIComponent(result.ticketId)}`,
      adminSession,
      { method: 'PATCH', body: JSON.stringify({ status: 'closed' }) },
    );
    const closedTicket = unpackTicket(closedPayload);
    result.ticketClosed = closedTicket?.status === 'closed';
    if (!result.ticketClosed) {
      throw new Error(`Expected closed ticket status, got ${closedTicket?.status || 'missing'}`);
    }

    result.mediaCleanupStatus = 'started';
    await apiMaybeJson(target.mediaUrl, `/api/v1/media/${encodeURIComponent(result.uploadedMediaId)}`, userSession, { method: 'DELETE' });
    const mediaAfterCleanup = await findMediaByFileName(userSession, fileName);
    if (mediaAfterCleanup) {
      throw new Error(`Support media cleanup verification failed for ${fileName}`);
    }
    result.mediaCleanupStatus = 'verified';
    result.screenshotAfterCleanup = path.join(outputDir, 'admin-ticket-after-close.png');
    await adminPage.reload({ waitUntil: 'domcontentloaded' });
    await adminPage.screenshot({ path: result.screenshotAfterCleanup, fullPage: true });

    result.overallOk =
      result.userComposerAttachmentVisible &&
      result.userTranscriptAttachmentVisible &&
      result.adminTranscriptAttachmentVisible &&
      result.apiMessageAttachmentVisible &&
      result.attachmentAccessUrlAvailable &&
      result.mediaRecordReassignedToTicket &&
      result.ticketClosed &&
      result.mediaCleanupStatus === 'verified' &&
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
    writeJson(path.join(outputDir, 'support-attachment-submit-proof.json'), result);
    await userContext.close();
    await adminContext.close();
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  ensureDir(outputDir);
  writeJson(path.join(outputDir, 'support-attachment-submit-proof-error.json'), {
    error: String(error?.stack || error),
    outputDir,
  });
  console.error(error);
  process.exitCode = 1;
});
