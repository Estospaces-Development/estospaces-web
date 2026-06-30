const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  createAuthedContext,
  loginViaApi,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

async function apiJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${url} -> ${response.status}: ${text}`);
  }

  return payload?.data ?? payload;
}

async function waitForComposer(page) {
  await page.getByRole('heading', { name: /^Messages$/i }).waitFor({ timeout: 120000 });
  const input = page.getByPlaceholder('Type your message...');
  await input.waitFor({ timeout: 120000 });
  return input;
}

async function sendFromUi(page, content) {
  const input = await waitForComposer(page);
  await input.fill(content);
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/v1/messages') && response.request().method() === 'POST',
    { timeout: 120000 },
  ).then((response) => ({ response }), (error) => ({ error }));
  await page.getByRole('button', { name: /^Send message$/i }).click();
  const { response, error } = await responsePromise;
  if (error) {
    throw error;
  }
  const body = await response.text().catch(() => '');

  if (response.status() < 200 || response.status() >= 300) {
    throw new Error(`UI send returned ${response.status()}: ${body}`);
  }

  await page.getByText(content, { exact: true }).first().waitFor({ timeout: 120000 });
  await page.getByPlaceholder('Type your message...').waitFor({ state: 'visible', timeout: 120000 });
  await page.waitForFunction(() => {
    const input = document.querySelector('input[placeholder="Type your message..."]');
    return input && input.value === '';
  }, null, { timeout: 120000 });
}

async function openAuthedPage(browser, session, url, interaction) {
  const context = await createAuthedContext(browser, session);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const networkErrors = [];

  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('/favicon')) {
      networkErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await interaction(page);
  await context.close();

  return { pageErrors, consoleErrors, networkErrors };
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  const artifactDir = path.join(process.cwd(), 'output', 'playwright');
  fs.mkdirSync(artifactDir, { recursive: true });

  const userScreenshot = path.join(artifactDir, `messaging-${target.name}-user-send-proof.png`);
  const managerScreenshot = path.join(artifactDir, `messaging-${target.name}-manager-reply-proof.png`);
  const result = {
    target: target.name,
    baseUrl: target.appBaseUrl,
    createdConversationId: null,
    userSendVisible: false,
    managerReadVisible: false,
    managerReplyVisible: false,
    userReadReplyVisible: false,
    pageErrors: [],
    consoleErrors: [],
    networkErrors: [],
    screenshots: {
      user: userScreenshot,
      manager: managerScreenshot,
    },
    overallOk: false,
  };
  const artifactPath = path.join(artifactDir, `messaging-${target.name}-ui-send-read-proof.json`);
  let browser = null;

  try {
    const userSession = await loginViaApi(target, 'user');
    const managerSession = await loginViaApi(target, 'manager');
    const conversation = await apiJson(`${target.services.messaging}/api/v1/conversations/direct`, userSession.token, {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: managerSession.storedUser.id,
        context: {
          sender_name: userSession.storedUser.name,
          sender_email: userSession.storedUser.email,
          recipient_name: managerSession.storedUser.name,
          recipient_email: managerSession.storedUser.email,
          property_title: 'Messaging regression check',
          property_address: 'Dev environment',
        },
      }),
    });
    const stamp = Date.now();
    const userMessage = `QA dev messaging user send ${stamp}`;
    const managerReply = `QA dev messaging manager reply ${stamp}`;
    const userUrl = `${target.appBaseUrl}/user/dashboard/messages?conversation=${conversation.id}`;
    const managerUrl = `${target.appBaseUrl}/manager/messages?conversation=${conversation.id}`;

    result.createdConversationId = conversation.id;
    browser = await chromium.launch({ headless: true });

    const userRun = await openAuthedPage(browser, userSession, userUrl, async (page) => {
      await sendFromUi(page, userMessage);
      result.userSendVisible = await page.getByText(userMessage, { exact: true }).first().isVisible();
      await page.screenshot({ path: userScreenshot, fullPage: true });
    });

    const managerRun = await openAuthedPage(browser, managerSession, managerUrl, async (page) => {
      await waitForComposer(page);
      await page.getByText(userMessage, { exact: true }).first().waitFor({ timeout: 120000 });
      result.managerReadVisible = await page.getByText(userMessage, { exact: true }).first().isVisible();
      await sendFromUi(page, managerReply);
      result.managerReplyVisible = await page.getByText(managerReply, { exact: true }).first().isVisible();
      await page.screenshot({ path: managerScreenshot, fullPage: true });
    });

    const userReadRun = await openAuthedPage(browser, userSession, userUrl, async (page) => {
      await waitForComposer(page);
      await page.getByText(managerReply, { exact: true }).first().waitFor({ timeout: 120000 });
      result.userReadReplyVisible = await page.getByText(managerReply, { exact: true }).first().isVisible();
    });

    for (const [label, run] of [['user', userRun], ['manager', managerRun], ['user-read', userReadRun]]) {
      result.pageErrors.push(...run.pageErrors.map((error) => `${label}: ${error}`));
      result.consoleErrors.push(...run.consoleErrors.map((error) => `${label}: ${error}`));
      result.networkErrors.push(...run.networkErrors.map((error) => `${label}: ${error}`));
    }

    result.overallOk = result.userSendVisible
      && result.managerReadVisible
      && result.managerReplyVisible
      && result.userReadReplyVisible
      && result.pageErrors.length === 0
      && result.consoleErrors.length === 0
      && result.networkErrors.length === 0;
  } catch (error) {
    result.error = String(error?.stack || error);
  } finally {
    await browser?.close();
    fs.writeFileSync(artifactPath, JSON.stringify(result, null, 2));
  }

  console.log(JSON.stringify(result, null, 2));
  if (!result.overallOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
