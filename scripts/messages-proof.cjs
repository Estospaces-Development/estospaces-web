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

async function getLiveConversation(target, token) {
  const response = await fetch(`${target.services.messaging}/api/v1/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Conversation preload failed with status ${response.status}`);
  }

  const conversations = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  const chosen = conversations.find((item) => item?.id) || conversations[0];
  if (!chosen?.id) {
    throw new Error('No live conversation available');
  }

  return {
    availableConversationCount: conversations.length,
    conversationId: chosen.id,
  };
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  const artifactPath = buildArtifactPath(`messages-${target.name}-full-proof.json`);
  const appBaseUrl = getRoleBaseUrl(target, 'user');
  const pageErrors = [];
  const consoleErrors = [];
  const networkErrors = [];
  const result = {
    target: target.name,
    baseUrl: appBaseUrl,
    availableConversationCount: 0,
    chosenConversationId: null,
    loginOk: false,
    messagesPageOk: false,
    newEnquiryOk: false,
    directThreadOk: false,
    staleQueryProofOk: false,
    directToastCount: 0,
    directThreadToastCount: 0,
    staleToastCount: 0,
    directThreadUrl: null,
    staleQueryUrl: null,
    staleHasUnavailableIssue: 0,
    pageErrors,
    consoleErrors,
    networkErrors,
    overallOk: false,
  };

  let browser = null;
  let context = null;

  try {
    await ensureReachable(appBaseUrl);
    const session = await loginViaApi(target, 'user');
    result.loginOk = true;
    const { availableConversationCount, conversationId } = await getLiveConversation(target, session.token);
    result.availableConversationCount = availableConversationCount;
    result.chosenConversationId = conversationId;

    browser = await chromium.launch({ headless: true });
    context = await createAuthedContext(browser, session);
    let tampered = false;

    await context.route(`${target.services.messaging}/api/v1/conversations*`, async (route) => {
      try {
        const response = await route.fetch();
        if (tampered) {
          await route.fulfill({ response });
          return;
        }

        tampered = true;
        const json = await response.json();
        const filtered = Array.isArray(json)
          ? json.filter((item) => item?.id !== conversationId)
          : Array.isArray(json?.data)
            ? { ...json, data: json.data.filter((item) => item?.id !== conversationId) }
            : json;
        await route.fulfill({ response, json: filtered });
      } catch (error) {
        if (/Target page, context or browser has been closed/i.test(String(error))) {
          return;
        }
        throw error;
      }
    });

    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(`${appBaseUrl}/user/dashboard/messages`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForURL(/\/user\/dashboard\/messages/, { timeout: 120000 });
    await page.getByRole('heading', { name: /^Messages$/i }).waitFor({ timeout: 120000 });
    await page.waitForTimeout(4000);
    result.directToastCount = await page.getByText(/Invalid data provided/i).count();
    result.messagesPageOk = result.directToastCount === 0;

    tampered = true;
    await page.goto(`${appBaseUrl}/user/dashboard/messages?conversation=${conversationId}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('heading', { name: /^Messages$/i }).waitFor({ timeout: 120000 });
    await page.waitForTimeout(5000);
    result.directThreadToastCount = await page.getByText(/Invalid data provided/i).count();
    result.directThreadUrl = page.url();
    const directUnavailable = await page.getByText(/This enquiry thread is unavailable/i).count();
    result.directThreadOk = result.directThreadToastCount === 0
      && directUnavailable === 0
      && result.directThreadUrl.includes(`conversation=${conversationId}`);

    const newEnquiryButton = page.getByRole('button', { name: /New Enquiry|Find Property to Enquiry/i }).first();
    await newEnquiryButton.click({ timeout: 20000 });
    await page.waitForURL(/\/user\/dashboard\/discover/, { timeout: 120000 });
    result.newEnquiryOk = true;

    tampered = false;
    await page.goto(`${appBaseUrl}/user/dashboard/messages?conversation=${conversationId}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('heading', { name: /^Messages$/i }).waitFor({ timeout: 120000 });
    await page.waitForTimeout(7000);
    result.staleToastCount = await page.getByText(/Invalid data provided/i).count();
    result.staleQueryUrl = page.url();
    result.staleHasUnavailableIssue = (await page.getByText(/This enquiry thread is unavailable/i).count()) > 0 ? 1 : 0;
    result.staleQueryProofOk = result.staleToastCount === 0
      && result.staleHasUnavailableIssue === 0
      && result.staleQueryUrl.includes(`conversation=${conversationId}`);

    result.overallOk = result.loginOk
      && result.messagesPageOk
      && result.newEnquiryOk
      && result.directThreadOk
      && result.staleQueryProofOk
      && pageErrors.length === 0
      && consoleErrors.length === 0
      && networkErrors.length === 0;
  } catch (error) {
    result.error = String(error);
    throw error;
  } finally {
    try {
      await context?.unrouteAll({ behavior: 'ignoreErrors' });
    } catch {}
    fs.writeFileSync(artifactPath, JSON.stringify(result, null, 2));
    await context?.close();
    await browser?.close();
  }

  if (!result.overallOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
