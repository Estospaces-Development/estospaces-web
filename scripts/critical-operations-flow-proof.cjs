const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  createAuthedContext,
  getRoleBaseUrl,
  loginViaApi,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(process.cwd(), 'output', 'playwright', 'critical-operations-flow-proof', runId);
const crashPattern = /unexpected application error|something went wrong|application error|referenceerror|typeerror:|toast is not defined/i;
const outOfScopePattern = /\b(3d virtual tour|virtual tour|invoice|billing|payment workspace|payments workspace)\b/i;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeName(value) {
  return String(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function attachDiagnostics(page, bucket) {
  page.on('pageerror', (error) => bucket.pageErrors.push(String(error.message || error)));
  page.on('requestfailed', (request) => {
    if (/estospaces|localhost|127\.0\.0\.1/i.test(request.url())) {
      bucket.networkErrors.push({ failed: request.url(), error: request.failure()?.errorText || 'request failed' });
    }
  });
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      const text = message.text();
      if (!/^Failed to load resource:/i.test(text) && !/downloadable font/i.test(text)) {
        bucket.consoleMessages.push({ type: message.type(), text });
      }
    }
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 500 && /estospaces|localhost|127\.0\.0\.1/i.test(response.url())) {
      bucket.networkErrors.push({ status, url: response.url() });
    }
  });
}

async function readBody(page) {
  return page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
}

async function waitForReadyText(page, expect, label) {
  await page.waitForLoadState('domcontentloaded', { timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  const deadline = Date.now() + 60000;
  let body = '';
  let lastReason = '';
  while (Date.now() < deadline) {
    body = await readBody(page);
    if (crashPattern.test(body)) {
      throw new Error(`Crash text detected for ${label}`);
    }
    if (outOfScopePattern.test(body)) {
      throw new Error(`Out-of-scope surface visible for ${label}: ${body.match(outOfScopePattern)?.[0]}`);
    }
    if (body.trim().length < 40 || body.trim() === 'Loading...') {
      lastReason = `Rendered too little content for ${label}`;
      await page.waitForTimeout(750);
      continue;
    }
    if (expect && !expect.test(body)) {
      lastReason = `Expected signal was not visible for ${label}`;
      await page.waitForTimeout(750);
      continue;
    }
    return body;
  }
  throw new Error(lastReason || `Page did not become ready for ${label}`);
}

async function captureStep({ browser, target, session, role, label, route, expect, afterLoad }) {
  const diagnostics = { pageErrors: [], consoleMessages: [], networkErrors: [] };
  const context = await createAuthedContext(browser, session);
  const page = await context.newPage();
  attachDiagnostics(page, diagnostics);
  const url = `${getRoleBaseUrl(target, role)}${route}`;
  const result = {
    label,
    role,
    route,
    url,
    finalUrl: '',
    status: 'running',
    screenshot: '',
    signals: {},
    diagnostics,
  };

  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 45000 });
    const body = await waitForReadyText(page, expect, label);
    if (afterLoad) {
      result.signals = await afterLoad(page, body);
    }
    result.finalUrl = page.url();
    result.screenshot = path.join(outputDir, `${safeName(`${role}-${label}`)}.png`);
    await page.screenshot({ path: result.screenshot, fullPage: true });
    result.status = diagnostics.pageErrors.length || diagnostics.consoleMessages.length || diagnostics.networkErrors.length
      ? 'failed'
      : 'passed';
    if (result.status === 'failed') result.error = 'Browser diagnostics contained errors';
  } catch (error) {
    result.status = 'failed';
    result.error = error?.message || String(error);
    result.finalUrl = page.url();
    result.screenshot = path.join(outputDir, `${safeName(`${role}-${label}`)}-failure.png`);
    await page.screenshot({ path: result.screenshot, fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
  return result;
}

async function getFirstCaseId(browser, target, session, role) {
  const diagnostics = { pageErrors: [], consoleMessages: [], networkErrors: [] };
  const context = await createAuthedContext(browser, session);
  const page = await context.newPage();
  attachDiagnostics(page, diagnostics);
  try {
    await page.goto(`${getRoleBaseUrl(target, role)}${role === 'user' ? '/user/dashboard/fast-track' : '/manager/fast-track'}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await waitForReadyText(page, /fast-track|journey|case/i, `${role} fast-track case discovery`);
    const card = page.locator('[data-fast-track-case-card]').first();
    await card.waitFor({ timeout: 30000 });
    const caseId = await card.getAttribute('data-fast-track-case-card');
    return {
      caseId: caseId || '',
      diagnostics,
    };
  } catch (error) {
    return {
      caseId: '',
      error: error?.message || String(error),
      diagnostics,
    };
  } finally {
    await context.close();
  }
}

async function captureFastTrackStage(browser, target, session, role, caseId, stage) {
  return captureStep({
    browser,
    target,
    session,
    role,
    label: `fast-track-${stage}`,
    route: `${role === 'user' ? '/user/dashboard/fast-track' : '/manager/fast-track'}?case=${encodeURIComponent(caseId)}&section=${stage}`,
    expect: new RegExp(stage, 'i'),
    afterLoad: async (page, body) => {
      const activeStage = await page.locator(`[data-fast-track-stage-tab="${stage}"]`).first().getAttribute('aria-current').catch(() => '');
      const handoverPrerequisiteVisible = stage === 'handover'
        ? await page.locator('[data-fast-track-handover-prerequisite]').count()
        : 0;
      const viewingSummaryVisible = stage === 'viewing'
        ? await page.locator('[data-fast-track-viewing-summary-card]').count()
        : 0;
      return {
        activeStage,
        containsStageText: new RegExp(stage, 'i').test(body),
        handoverPrerequisiteVisible,
        viewingSummaryVisible,
      };
    },
  });
}

async function captureSearchAndPropertyResponseWindow(browser, target, session) {
  const diagnostics = { pageErrors: [], consoleMessages: [], networkErrors: [] };
  const context = await createAuthedContext(browser, session);
  const page = await context.newPage();
  attachDiagnostics(page, diagnostics);
  const result = {
    label: 'user-property-10-minute-response',
    role: 'user',
    route: '/search -> first property detail',
    url: `${getRoleBaseUrl(target, 'user')}/search`,
    finalUrl: '',
    status: 'running',
    screenshot: '',
    signals: {},
    diagnostics,
  };

  try {
    await page.goto(result.url, { waitUntil: 'commit', timeout: 45000 });
    await waitForReadyText(page, /search|property/i, result.label);
    const viewDetails = page.getByRole('button', { name: /view details/i }).first();
    await viewDetails.waitFor({ timeout: 45000 });
    await viewDetails.click();
    await page.waitForURL((url) => /\/user\/properties\//.test(url.pathname), { timeout: 45000 });
    const body = await waitForReadyText(page, /10-minute|response window|SLA|broker response/i, result.label);
    result.signals = {
      hasTenMinuteResponse: /10-minute|10 minute/i.test(body),
      hasSlaSignal: /sla|response window|broker response/i.test(body),
    };
    result.finalUrl = page.url();
    result.screenshot = path.join(outputDir, 'user-property-10-minute-response.png');
    await page.screenshot({ path: result.screenshot, fullPage: true });
    result.status = diagnostics.pageErrors.length || diagnostics.consoleMessages.length || diagnostics.networkErrors.length
      ? 'failed'
      : 'passed';
    if (result.status === 'failed') result.error = 'Browser diagnostics contained errors';
  } catch (error) {
    result.status = 'failed';
    result.error = error?.message || String(error);
    result.finalUrl = page.url();
    result.screenshot = path.join(outputDir, 'user-property-10-minute-response-failure.png');
    await page.screenshot({ path: result.screenshot, fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
  return result;
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  ensureDir(outputDir);
  const reportPath = path.join(outputDir, 'critical-operations-flow-proof.json');
  const browser = await chromium.launch({ headless: true });
  const report = {
    target: target.name,
    baseUrls: {
      user: getRoleBaseUrl(target, 'user'),
      manager: getRoleBaseUrl(target, 'manager'),
      admin: getRoleBaseUrl(target, 'admin'),
    },
    startedAt: new Date().toISOString(),
    scope: [
      'verification',
      '10-minute response/SLA',
      'fast track',
      'appointments/viewings',
      'messaging',
      'leads',
      'handover',
    ],
    exclusions: ['landing pages', 'cybersecurity/destructive tests', '3D/virtual tour', 'payments/invoices workspace'],
    caseDiscovery: {},
    results: [],
    summary: { passed: 0, failed: 0 },
    overallOk: false,
  };

  try {
    const sessions = {
      user: await loginViaApi(target, 'user'),
      manager: await loginViaApi(target, 'manager'),
      admin: await loginViaApi(target, 'admin'),
    };

    report.results.push(await captureStep({
      browser,
      target,
      session: sessions.user,
      role: 'user',
      label: 'verification-profile',
      route: '/user/dashboard/profile',
      expect: /profile|verification|documents|account/i,
    }));
    report.results.push(await captureStep({
      browser,
      target,
      session: sessions.manager,
      role: 'manager',
      label: 'verification-manager',
      route: '/manager/verification',
      expect: /verification|identity|document|profile/i,
    }));
    report.results.push(await captureStep({
      browser,
      target,
      session: sessions.admin,
      role: 'admin',
      label: 'verification-admin',
      route: '/admin/verifications?entity=user',
      expect: /verification|users|documents|review/i,
    }));

    report.results.push(await captureSearchAndPropertyResponseWindow(browser, target, sessions.user));
    report.results.push(await captureStep({
      browser,
      target,
      session: sessions.manager,
      role: 'manager',
      label: 'leads-10-minute-response',
      route: '/manager/leads',
      expect: /lead|sla|10-minute|response/i,
    }));

    report.results.push(await captureStep({
      browser,
      target,
      session: sessions.user,
      role: 'user',
      label: 'appointments-viewings-user',
      route: '/user/dashboard/viewings',
      expect: /appointment|viewing/i,
    }));
    report.results.push(await captureStep({
      browser,
      target,
      session: sessions.manager,
      role: 'manager',
      label: 'appointments-manager',
      route: '/manager/appointments',
      expect: /appointment|viewing|calendar/i,
    }));

    report.results.push(await captureStep({
      browser,
      target,
      session: sessions.user,
      role: 'user',
      label: 'messaging-user',
      route: '/user/dashboard/messages',
      expect: /message|conversation|inbox/i,
    }));
    report.results.push(await captureStep({
      browser,
      target,
      session: sessions.manager,
      role: 'manager',
      label: 'messaging-manager',
      route: '/manager/messages',
      expect: /message|conversation|inbox/i,
    }));

    report.results.push(await captureStep({
      browser,
      target,
      session: sessions.user,
      role: 'user',
      label: 'fast-track-user',
      route: '/user/dashboard/fast-track',
      expect: /fast-track|journey|case/i,
    }));
    report.results.push(await captureStep({
      browser,
      target,
      session: sessions.manager,
      role: 'manager',
      label: 'fast-track-manager',
      route: '/manager/fast-track',
      expect: /fast-track|journey|case/i,
    }));

    report.caseDiscovery.user = await getFirstCaseId(browser, target, sessions.user, 'user');
    report.caseDiscovery.manager = await getFirstCaseId(browser, target, sessions.manager, 'manager');
    if (report.caseDiscovery.user.caseId) {
      report.results.push(await captureFastTrackStage(browser, target, sessions.user, 'user', report.caseDiscovery.user.caseId, 'viewing'));
      report.results.push(await captureFastTrackStage(browser, target, sessions.user, 'user', report.caseDiscovery.user.caseId, 'handover'));
    } else {
      report.results.push({
        label: 'user-fast-track-stage-discovery',
        role: 'user',
        status: 'failed',
        error: report.caseDiscovery.user.error || 'No fast-track case card was available for user stage checks.',
      });
    }
    if (report.caseDiscovery.manager.caseId) {
      report.results.push(await captureFastTrackStage(browser, target, sessions.manager, 'manager', report.caseDiscovery.manager.caseId, 'viewing'));
      report.results.push(await captureFastTrackStage(browser, target, sessions.manager, 'manager', report.caseDiscovery.manager.caseId, 'handover'));
    } else {
      report.results.push({
        label: 'manager-fast-track-stage-discovery',
        role: 'manager',
        status: 'failed',
        error: report.caseDiscovery.manager.error || 'No fast-track case card was available for manager stage checks.',
      });
    }
  } finally {
    await browser.close();
  }

  for (const result of report.results) {
    if (result.status === 'passed') report.summary.passed += 1;
    else report.summary.failed += 1;
  }
  report.completedAt = new Date().toISOString();
  report.overallOk = report.summary.failed === 0;
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ reportPath, summary: report.summary, overallOk: report.overallOk }, null, 2));
  if (!report.overallOk) process.exitCode = 1;
}

main().catch((error) => {
  ensureDir(outputDir);
  fs.writeFileSync(path.join(outputDir, 'critical-operations-flow-proof.error.json'), `${JSON.stringify({
    error: error?.stack || String(error),
    completedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.error(error?.stack || error);
  process.exit(1);
});
