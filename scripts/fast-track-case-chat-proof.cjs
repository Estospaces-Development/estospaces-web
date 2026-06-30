const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  buildArtifactPath,
  createAuthedContext,
  loginViaApi,
  parseJson,
  parseOption,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

function outputPrefix(outputPath) {
  return outputPath.endsWith('.json') ? outputPath.slice(0, -5) : outputPath;
}

async function fetchCase(target, token, caseId) {
  const response = await fetch(`${target.services.booking}/api/v1/fast-track/${caseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await parseJson(response, `fast-track case ${caseId}`);
  return payload?.data || payload;
}

async function attachDiagnostics(page, bucket) {
  page.on('pageerror', (error) => bucket.pageErrors.push(String(error)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      bucket.consoleErrors.push(msg.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      bucket.networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });
}

async function collectChatMetrics(page) {
  await openCaseChat(page);
  await page.locator('[aria-label="Journey messages"], [aria-label="Case chat transcript"]').first().waitFor({ timeout: 120000 });
  return page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll('p, h2, h3, span')).find((node) => /^(case chat|messages)$/i.test((node.textContent || '').trim()));
    const previewHeading = Array.from(document.querySelectorAll('h3')).find((node) => (node.textContent || '').trim() === 'Preview');
    const section = heading?.closest('[data-fast-track-utility-panel], section, div');
    const previewSection = previewHeading?.closest('section');
    const rect = section?.getBoundingClientRect();
    const previewRect = previewSection?.getBoundingClientRect();
    const transcript = section?.querySelector('[aria-label="Journey messages"], [aria-label="Case chat transcript"]');
    return {
      viewportHeight: window.innerHeight,
      caseChatTop: rect ? Math.round(rect.top) : null,
      caseChatBottom: rect ? Math.round(rect.bottom) : null,
      caseChatInViewport: rect ? rect.top < window.innerHeight && rect.bottom > 0 : false,
      previewTop: previewRect ? Math.round(previewRect.top) : null,
      previewBottom: previewRect ? Math.round(previewRect.bottom) : null,
      previewInViewport: previewRect ? previewRect.top < window.innerHeight && previewRect.bottom > 0 : false,
      iconSvgCount: section ? section.querySelectorAll('svg').length : 0,
      transcriptScrollHeight: transcript ? transcript.scrollHeight : 0,
      transcriptClientHeight: transcript ? transcript.clientHeight : 0,
    };
  });
}

async function waitForWorkspace(page) {
  await page.locator('[data-fast-track-workspace-status]').waitFor({ timeout: 120000 });
  await page.locator('[data-fast-track-stage-tab]').first().waitFor({ timeout: 120000 });
}

async function openCaseChat(page) {
  const tab = page.locator('[data-fast-track-utility-tab="case_chat"]').first();
  if (await tab.count()) {
    if (!(await tab.isVisible().catch(() => false))) {
      const detailsSummary = page.locator('summary').filter({ hasText: /see details/i }).first();
      if (await detailsSummary.count()) {
        await detailsSummary.click();
      }
    }
    await tab.waitFor({ state: 'visible', timeout: 120000 });
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
  } else {
    await page.getByRole('button', { name: /case chat|messages/i }).first().click({ timeout: 120000 });
  }
}

async function sendMessageFromPage(page, text) {
  await openCaseChat(page);
  const box = page.locator('textarea[placeholder*="Write one clear"]').first();
  await box.scrollIntoViewIfNeeded();
  await box.fill(text);
  await page.getByRole('button', { name: /^Send update$/i }).click();
  await page.getByText(text, { exact: true }).waitFor({ timeout: 120000 });
}

async function waitForMessage(page, text) {
  await openCaseChat(page);
  await page.locator('[aria-label="Journey messages"], [aria-label="Case chat transcript"]').first().waitFor({ timeout: 120000 });
  await page.getByText(text, { exact: true }).waitFor({ timeout: 120000 });
}

async function main() {
  const argv = process.argv.slice(2);
  const target = resolveTarget(argv);
  const baseUrl = parseOption(argv, '--base-url') || process.env.BASE_URL || target.baseUrl;
  const caseId = parseOption(argv, '--case-id') || process.env.CASE_ID || '';
  const outputPath = parseOption(argv, '--output')
    || process.env.OUTPUT_PATH
    || buildArtifactPath(`fast-track-case-chat-${target.name}-proof.json`);

  if (!caseId) {
    throw new Error('Missing required case id. Pass --case-id=<id> or set CASE_ID.');
  }

  const prefix = outputPrefix(outputPath);
  const userShot = `${prefix}-user.png`;
  const managerShot = `${prefix}-manager.png`;
  const userRoute = `${baseUrl}/user/dashboard/fast-track?case=${caseId}`;
  const managerRoute = `${baseUrl}/manager/fast-track?case=${caseId}`;

  const result = {
    target: target.name,
    baseUrl,
    caseId,
    userRoute,
    managerRoute,
    userMetricsInitial: null,
    managerMetricsInitial: null,
    userMessage: null,
    managerReply: null,
    userSentOk: false,
    managerSawUserMessage: false,
    managerSentOk: false,
    userSawManagerReply: false,
    userScreenshot: userShot,
    managerScreenshot: managerShot,
    caseSummary: null,
    userDiagnostics: { pageErrors: [], consoleErrors: [], networkErrors: [] },
    managerDiagnostics: { pageErrors: [], consoleErrors: [], networkErrors: [] },
    overallOk: false,
  };

  const userSession = await loginViaApi(target, 'user');
  const managerSession = await loginViaApi(target, 'manager');
  const caseData = await fetchCase(target, userSession.token, caseId);
  const stamp = Date.now();

  result.caseSummary = {
    propertyTitle: caseData.property_title || caseData.header?.property_title || '',
    stage: caseData.stage,
    finalStatus: caseData.final_status,
  };
  result.userMessage = `${target.name} user chat visibility ${stamp}`;
  result.managerReply = `${target.name} manager chat visibility ${stamp}`;

  const browser = await chromium.launch({ headless: true });
  const userContext = await createAuthedContext(browser, userSession);
  const managerContext = await createAuthedContext(browser, managerSession);

  try {
    const userPage = await userContext.newPage();
    const managerPage = await managerContext.newPage();
    await attachDiagnostics(userPage, result.userDiagnostics);
    await attachDiagnostics(managerPage, result.managerDiagnostics);

    await userPage.goto(userRoute, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForWorkspace(userPage);
    result.userMetricsInitial = await collectChatMetrics(userPage);
    await userPage.screenshot({ path: userShot });
    await sendMessageFromPage(userPage, result.userMessage);
    result.userSentOk = true;

    await managerPage.goto(managerRoute, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForWorkspace(managerPage);
    result.managerMetricsInitial = await collectChatMetrics(managerPage);
    await managerPage.screenshot({ path: managerShot });
    await waitForMessage(managerPage, result.userMessage);
    result.managerSawUserMessage = true;
    await sendMessageFromPage(managerPage, result.managerReply);
    result.managerSentOk = true;

    await userPage.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForWorkspace(userPage);
    await waitForMessage(userPage, result.managerReply);
    result.userSawManagerReply = true;

    result.overallOk = result.userSentOk
      && result.managerSawUserMessage
      && result.managerSentOk
      && result.userSawManagerReply
      && (result.userMetricsInitial?.iconSvgCount || 0) > 0
      && (result.managerMetricsInitial?.iconSvgCount || 0) > 0
      && result.userDiagnostics.pageErrors.length === 0
      && result.userDiagnostics.consoleErrors.length === 0
      && result.userDiagnostics.networkErrors.length === 0
      && result.managerDiagnostics.pageErrors.length === 0
      && result.managerDiagnostics.consoleErrors.length === 0
      && result.managerDiagnostics.networkErrors.length === 0;
  } finally {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    await userContext.close();
    await managerContext.close();
    await browser.close();
  }

  if (!result.overallOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
