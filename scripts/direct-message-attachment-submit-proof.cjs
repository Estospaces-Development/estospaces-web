const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const fallbackCredentialSource = path.join(__dirname, 'live-1000-catalog-proof.cjs');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'direct-message-attachment-submit-proof', runId);

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
    'http://localhost:3000'
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
    Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n'),
  );
  return filePath;
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

async function waitForComposer(page) {
  await page.getByRole('heading', { name: /^Messages$/i }).waitFor({ timeout: 60000 });
  await page.getByPlaceholder('Type your message...').waitFor({ timeout: 60000 });
}

function conversationMessages(page) {
  return page.getByLabel('Conversation messages');
}

async function main() {
  ensureDir(outputDir);
  const stamp = Date.now();
  const messageText = `QA direct message attachment persistence ${stamp}`;
  const fileName = `qa-direct-message-attachment-${stamp}.pdf`;
  const filePath = createQaPdf(fileName);
  const result = {
    target,
    createdAt: new Date().toISOString(),
    outputDir,
    messageText,
    fileName,
    conversationId: '',
    messageId: '',
    messageAttachmentId: '',
    uploadedMediaId: '',
    mediaEntityType: '',
    mediaEntityId: '',
    userComposerAttachmentVisible: false,
    userTranscriptAttachmentVisible: false,
    managerTranscriptAttachmentVisible: false,
    apiMessageAttachmentVisible: false,
    mediaRecordLinkedToConversation: false,
    mediaCleanupStatus: 'not_started',
    chatMessageCleanupAvailable: false,
    screenshotUserMessage: '',
    screenshotManagerMessage: '',
    pageErrors: [],
    consoleMessages: [],
    networkErrors: [],
    overallOk: false,
  };

  const userSession = await loginViaApi('user');
  const managerSession = await loginViaApi('manager');
  const conversationPayload = await apiJson(
    target.messagingUrl,
    '/api/v1/conversations/direct',
    userSession,
    {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: managerSession.storedUser.id,
        context: {
          sender_name: userSession.storedUser.name,
          sender_email: userSession.storedUser.email,
          recipient_name: managerSession.storedUser.name,
          recipient_email: managerSession.storedUser.email,
          property_title: 'Direct attachment regression check',
          property_address: 'Dev environment',
        },
      }),
    },
  );
  const conversation = conversationPayload?.data ?? conversationPayload;
  result.conversationId = String(conversation?.id || '');
  if (!result.conversationId) {
    throw new Error(`Direct conversation id missing: ${JSON.stringify(conversationPayload)}`);
  }

  const browser = await chromium.launch({ headless: true });
  const userContext = await createAuthedContext(browser, userSession);
  const managerContext = await createAuthedContext(browser, managerSession);
  const userPage = await userContext.newPage();
  const managerPage = await managerContext.newPage();
  attachDiagnostics(userPage, result, 'user');
  attachDiagnostics(managerPage, result, 'manager');

  try {
    await userPage.goto(`${target.baseUrl}/user/dashboard/messages?conversation=${encodeURIComponent(result.conversationId)}`, { waitUntil: 'domcontentloaded' });
    await waitForComposer(userPage);
    await userPage.locator('input[name="message-attachments"]').setInputFiles(filePath);
    await userPage.getByText(fileName).waitFor({ timeout: 30000 });
    result.userComposerAttachmentVisible = true;
    await userPage.getByPlaceholder('Type your message...').fill(messageText);
    await userPage.getByRole('button', { name: /^Send message$/i }).click();
    await conversationMessages(userPage).getByText(messageText, { exact: true }).waitFor({ timeout: 60000 });
    await conversationMessages(userPage).getByText(fileName).waitFor({ timeout: 60000 });
    result.userTranscriptAttachmentVisible = true;
    result.screenshotUserMessage = path.join(outputDir, 'user-direct-message-with-attachment.png');
    await userPage.screenshot({ path: result.screenshotUserMessage, fullPage: true });

    const messagesPayload = await apiJson(
      target.messagingUrl,
      `/api/v1/conversations/${encodeURIComponent(result.conversationId)}/messages?page=1&limit=50`,
      userSession,
    );
    const messages = unpackMessages(messagesPayload);
    const messageWithAttachment = messages.find((item) => (
      item.content === messageText &&
      Array.isArray(item.attachments) &&
      item.attachments.some((attachment) => attachment.file_name === fileName)
    ));
    const apiAttachment = messageWithAttachment?.attachments?.find((attachment) => attachment.file_name === fileName);
    if (!messageWithAttachment?.id || !apiAttachment?.id) {
      throw new Error(`Direct message attachment not found in API transcript for ${fileName}`);
    }
    result.messageId = String(messageWithAttachment.id);
    result.messageAttachmentId = String(apiAttachment.id);
    result.apiMessageAttachmentVisible = true;

    let mediaFile = await findMediaByFileName(userSession, fileName);
    if (!mediaFile) {
      await userPage.waitForTimeout(2000);
      mediaFile = await findMediaByFileName(userSession, fileName);
    }
    if (!mediaFile?.id) throw new Error(`Direct message media record not found for ${fileName}`);
    result.uploadedMediaId = String(mediaFile.id || '');
    result.mediaEntityType = String(mediaFile.entity_type || '');
    result.mediaEntityId = String(mediaFile.entity_id || '');
    result.mediaRecordLinkedToConversation =
      result.mediaEntityType === 'message' &&
      result.mediaEntityId === result.conversationId;
    if (!result.mediaRecordLinkedToConversation) {
      throw new Error(`Direct message media was not linked to the conversation. media=${JSON.stringify(mediaFile)}`);
    }

    await managerPage.goto(`${target.baseUrl}/manager/messages?conversation=${encodeURIComponent(result.conversationId)}`, { waitUntil: 'domcontentloaded' });
    await waitForComposer(managerPage);
    await conversationMessages(managerPage).getByText(messageText, { exact: true }).waitFor({ timeout: 60000 });
    await conversationMessages(managerPage).getByText(fileName).waitFor({ timeout: 60000 });
    result.managerTranscriptAttachmentVisible = true;
    result.screenshotManagerMessage = path.join(outputDir, 'manager-direct-message-with-attachment.png');
    await managerPage.screenshot({ path: result.screenshotManagerMessage, fullPage: true });

    result.mediaCleanupStatus = 'started';
    await apiMaybeJson(target.mediaUrl, `/api/v1/media/${encodeURIComponent(result.uploadedMediaId)}`, userSession, { method: 'DELETE' });
    const mediaAfterCleanup = await findMediaByFileName(userSession, fileName);
    if (mediaAfterCleanup) {
      throw new Error(`Direct message media cleanup verification failed for ${fileName}`);
    }
    result.mediaCleanupStatus = 'verified';

    result.overallOk =
      result.userComposerAttachmentVisible &&
      result.userTranscriptAttachmentVisible &&
      result.managerTranscriptAttachmentVisible &&
      result.apiMessageAttachmentVisible &&
      result.mediaRecordLinkedToConversation &&
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
    writeJson(path.join(outputDir, 'direct-message-attachment-submit-proof.json'), result);
    await userContext.close();
    await managerContext.close();
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  ensureDir(outputDir);
  writeJson(path.join(outputDir, 'direct-message-attachment-submit-proof-error.json'), {
    error: String(error?.stack || error),
    outputDir,
  });
  console.error(error);
  process.exitCode = 1;
});
