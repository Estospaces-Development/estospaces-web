const fs = require('node:fs');
const path = require('node:path');
const { chromium, firefox } = require('playwright');
const {
  buildArtifactPath,
  resolveTarget,
  shouldRecordConsoleError,
} = require('./platform-proof-shared.cjs');
const { summarizeFailedResults } = require('./release-smoke-diagnostics.cjs');

const publicRoutes = [
  { route: '/', expected: /Search|Dashboard|Estospaces|Login/i },
  { route: '/login/', expected: /Sign In|Login/i },
  { route: '/register', expected: /Register|Create account|Sign Up/i },
  { route: '/forgot-password', expected: /Forgot password|Reset/i },
  { route: '/contact', expected: /Contact|Get in touch/i },
  { route: '/faq', expected: /FAQ|Frequently Asked/i },
  { route: '/privacy', expected: /Privacy/i },
  { route: '/terms', expected: /Terms/i },
];

const requiredHeaders = [
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'content-security-policy',
];

function result(id, passed, actual, expected, errors = []) {
  return { id, status: passed ? 'passed' : 'failed', actual, expected, errors };
}

async function fetchText(url, options = {}) {
  const started = Date.now();
  const response = await fetch(url, { redirect: 'manual', ...options });
  return {
    url,
    status: response.status,
    ms: Date.now() - started,
    headers: Object.fromEntries(response.headers.entries()),
    text: await response.text(),
  };
}

async function runHttpChecks(target) {
  const checks = [
    { name: 'app-shell', url: target.baseUrl, ok: (status) => status === 200 || status === 302 },
    { name: 'admin-login', url: `${target.adminBaseUrl}/login/`, ok: (status) => status === 200 || status === 302 },
    ...Object.entries(target.services).map(([name, url]) => ({
      name: `${name}-health`,
      url: `${url}/health`,
      ok: (status) => status === 200,
    })),
  ];

  const results = [];
  for (const check of checks) {
    const response = await fetchText(check.url);
    results.push(result(
      `http:${check.name}`,
      check.ok(response.status),
      JSON.stringify({ status: response.status, ms: response.ms }),
      'Expected healthy 2xx/302 response',
    ));
  }
  return results;
}

async function runHeaderChecks(target) {
  const response = await fetchText(target.baseUrl);
  const results = requiredHeaders.map((header) => {
    const value = response.headers[header] || '';
    return result(
      `headers:${header}`,
      value.trim().length > 0,
      value,
      'Header must be present on the app shell',
    );
  });
  const expectedBuildRevision = process.env.E2E_EXPECTED_BUILD_REVISION || '';
  if (expectedBuildRevision) {
    const servedBuildRevision = response.headers['x-estospaces-build'] || '';
    results.push(result(
      'headers:x-estospaces-build',
      servedBuildRevision === expectedBuildRevision,
      servedBuildRevision,
      `Expected exact build ${expectedBuildRevision}`,
    ));
  }
  return results;
}

async function runUnauthenticatedApiChecks(target) {
  const checks = [
    ['core-auth-me', `${target.services.core}/api/v1/auth/me`],
    ['booking-list', `${target.services.booking}/api/v1/bookings`],
    ['payment-list', `${target.services.payment}/api/v1/payments`],
    ['media-mine', `${target.services.media}/api/v1/media/mine`],
    ['messaging-conversations', `${target.services.messaging}/api/v1/conversations`],
    ['notification-list', `${target.services.notification}/api/v1/notifications`],
    ['search-saved', `${target.services.search}/api/v1/search/saved`],
  ];

  const results = [];
  for (const [name, url] of checks) {
    const response = await fetchText(url);
    results.push(result(
      `unauth:${name}`,
      response.status === 401 || response.status === 403,
      JSON.stringify({ status: response.status, body: response.text.slice(0, 160) }),
      'Unauthenticated protected API request must return 401 or 403',
    ));
  }
  return results;
}

async function runPublicBrowserPass(browserType, target, viewport, label) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const networkErrors = [];

  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (msg) => {
    if (shouldRecordConsoleError(msg.type(), msg.text())) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 500) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  const results = [];
  try {
    for (const item of publicRoutes) {
      await page.goto(`${target.baseUrl}${item.route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      const text = await page.locator('body').innerText();
      results.push(result(
        `browser:${label}:${item.route}`,
        item.expected.test(text),
        JSON.stringify({ actualPath: new URL(page.url()).pathname, textSample: text.slice(0, 120) }),
        'Expected public/auth route to render matching page content',
      ));
    }

    await page.goto(`${target.adminBaseUrl}/login/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const emailVisible = await emailInput.isVisible().catch(() => false);
    const passwordVisible = await passwordInput.isVisible().catch(() => false);
    results.push(result(
      `browser:${label}:admin-login-form`,
      emailVisible && passwordVisible,
      JSON.stringify({
        actualUrl: page.url(),
        emailVisible,
        passwordVisible,
      }),
      'Expected visible email and password inputs on the Admin host login route',
    ));
  } finally {
    await context.close();
    await browser.close();
  }

  results.push(result(
    `browser-health:${label}`,
    pageErrors.length === 0 && consoleErrors.length === 0 && networkErrors.length === 0,
    JSON.stringify({ pageErrors, consoleErrors, networkErrors }),
    'No browser page errors, console errors, or 5xx network errors',
    [...pageErrors, ...consoleErrors, ...networkErrors],
  ));
  return results;
}

async function runProtectedRedirectChecks(target) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const routes = [
    { id: 'user-dashboard', baseUrl: target.appBaseUrl, route: '/user/dashboard', expected: /\/login\/?$/ },
    { id: 'user-bookings', baseUrl: target.appBaseUrl, route: '/user/bookings', expected: /\/login\/?$/ },
    { id: 'user-payments-phase-two', baseUrl: target.appBaseUrl, route: '/user/dashboard/payments', expected: /\/login\/?$/ },
    { id: 'manager-dashboard', baseUrl: target.appBaseUrl, route: '/manager/dashboard', expected: /\/login\/?$/ },
    { id: 'manager-billing-phase-two', baseUrl: target.appBaseUrl, route: '/manager/billing', expected: /\/login\/?$/ },
    { id: 'admin-dashboard', baseUrl: target.adminBaseUrl, route: '/admin/dashboard', expected: /\/login\/?$/ },
  ];

  const results = [];
  try {
    for (const item of routes) {
      await page.goto(`${item.baseUrl}${item.route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      const rejectOptionalTools = page.getByRole('button', { name: /Reject optional tools/i });
      if (await rejectOptionalTools.isVisible().catch(() => false)) {
        await rejectOptionalTools.click();
      }
      await page.waitForURL((url) => item.expected.test(url.pathname), { timeout: 10000 }).catch(() => {});
      const actual = page.url();
      results.push(result(
        `protected-redirect:${item.id}`,
        item.expected.test(new URL(actual).pathname),
        actual,
        'Unauthenticated protected browser route redirects to login',
      ));
    }
  } finally {
    await context.close();
    await browser.close();
  }
  return results;
}

async function runLatencySmoke(target) {
  const urls = [
    target.baseUrl,
    `${target.services.core}/health`,
    `${target.services.search}/health`,
    `${target.services.booking}/health`,
  ];
  const results = [];

  for (const url of urls) {
    const samples = [];
    for (let i = 0; i < 3; i += 1) {
      const response = await fetchText(url);
      samples.push({ status: response.status, ms: response.ms });
    }
    const max = Math.max(...samples.map((item) => item.ms));
    results.push(result(
      `latency:${url}`,
      samples.every((item) => item.status < 500) && max < 5000,
      JSON.stringify({ max, samples }),
      'Three low-rate smoke samples without 5xx and max latency below 5s',
    ));
  }
  return results;
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  const artifactPath = buildArtifactPath(`app-release-smoke-${target.name}.json`);
  const results = [
    ...await runHttpChecks(target),
    ...await runHeaderChecks(target),
    ...await runUnauthenticatedApiChecks(target),
    ...await runPublicBrowserPass(chromium, target, { width: 1440, height: 960 }, 'chromium-desktop'),
    ...await runPublicBrowserPass(chromium, target, { width: 390, height: 844 }, 'chromium-mobile'),
    ...await runPublicBrowserPass(chromium, target, { width: 283, height: 642 }, 'chromium-narrow'),
    ...await runPublicBrowserPass(firefox, target, { width: 1440, height: 960 }, 'firefox-desktop'),
    ...await runProtectedRedirectChecks(target),
    ...await runLatencySmoke(target),
  ];

  const payload = {
    target: target.name,
    generatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter((item) => item.status === 'passed').length,
      failed: results.filter((item) => item.status === 'failed').length,
      overallOk: results.every((item) => item.status === 'passed'),
    },
    results,
  };

  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, JSON.stringify(payload, null, 2));
  process.stdout.write(`${JSON.stringify(payload.summary, null, 2)}\n`);

  if (!payload.summary.overallOk) {
    const failedResults = summarizeFailedResults(results);
    process.stderr.write(`Failed release smoke checks:\n${JSON.stringify(failedResults, null, 2)}\n`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
