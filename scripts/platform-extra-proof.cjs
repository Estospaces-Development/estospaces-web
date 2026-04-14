const fs = require('node:fs');
const { chromium, firefox } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const {
  buildArtifactPath,
  createAuthedContext,
  ensureReachable,
  loginViaApi,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

const ANON_UTF8_TEXT = '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd Caf\u00e9 \u00a3123';

function scenario(category, environment, role, surface, passed, actual, errors = []) {
  return {
    category,
    environment,
    role,
    surface,
    status: passed ? 'passed' : 'failed',
    actual,
    errors,
  };
}

async function openPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

async function collectPageHealth(page) {
  const pageErrors = [];
  const consoleErrors = [];
  const networkErrors = [];

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

  return { pageErrors, consoleErrors, networkErrors };
}

function filterExpectedStaleAuthNetworkErrors(errors) {
  return errors.filter((entry) => {
    if (!entry.startsWith('401 ')) {
      return true;
    }

    return !(
      entry.includes('/api/v1/auth/profile')
      || entry.includes('/api/v1/auth/me')
      || entry.includes('/api/v1/conversations')
      || entry.includes('/api/v1/notifications')
      || entry.includes('/api/v1/properties/saved')
      || entry.includes('/api/v1/leads/broker-request/mine')
      || entry.includes('/api/v1/properties/mine')
      || entry.includes('/api/v1/applications')
      || entry.includes('/api/v1/sale-progressions')
      || entry.includes('/api/v1/viewings')
      || entry.includes('/api/v1/fast-track')
      || entry.includes('/profile')
      || entry.includes('/me')
    );
  });
}

function filterExpectedStaleAuthConsoleErrors(errors) {
  return errors.filter((entry) => {
    if (!entry.includes('401')) {
      return true;
    }

    return !entry.includes('Failed to load resource: the server responded with a status of 401');
  });
}

async function runAccessibilityChecks(target) {
  const routes = [
    { role: 'anonymous', route: '/login' },
    { role: 'anonymous', route: '/' },
    { role: 'user', route: '/user/dashboard' },
    { role: 'user', route: '/user/dashboard/messages' },
    { role: 'user', route: '/user/dashboard/fast-track' },
    { role: 'manager', route: '/manager/dashboard' },
    { role: 'manager', route: '/manager/messages' },
    { role: 'manager', route: '/manager/fast-track' },
    { role: 'admin', route: '/admin/dashboard' },
    { role: 'admin', route: '/admin/help' },
    { role: 'admin', route: '/admin/fast-track' },
  ];

  const browser = await chromium.launch({ headless: true });
  const anonContext = await browser.newContext({ viewport: { width: 1440, height: 960 }, ignoreHTTPSErrors: true });
  const userContext = await createAuthedContext(browser, await loginViaApi(target, 'user'));
  const managerContext = await createAuthedContext(browser, await loginViaApi(target, 'manager'));
  const adminContext = await createAuthedContext(browser, await loginViaApi(target, 'admin'));

  const contexts = {
    anonymous: anonContext,
    user: userContext,
    manager: managerContext,
    admin: adminContext,
  };

  const results = [];
  try {
    for (const item of routes) {
      const page = await contexts[item.role].newPage();
      const health = await collectPageHealth(page);
      await openPage(page, `${target.baseUrl}${item.route}`);

      const axe = await new AxeBuilder({ page }).analyze();
      const keyboardBefore = await page.evaluate(() => document.activeElement?.tagName || 'BODY');
      await page.keyboard.press('Tab');
      const keyboardAfter = await page.evaluate(() => {
        const active = document.activeElement;
        return {
          tag: active?.tagName || 'BODY',
          text: active?.textContent?.trim()?.slice(0, 80) || '',
          aria: active?.getAttribute?.('aria-label') || '',
        };
      });

      results.push({
        role: item.role,
        route: item.route,
        violations: axe.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.map((node) => node.target.join(' ')),
        })),
        pageErrors: health.pageErrors,
        consoleErrors: health.consoleErrors,
        networkErrors: health.networkErrors,
        keyboardBefore,
        keyboardAfter,
      });

      await page.close();
    }
  } finally {
    await Promise.all([
      anonContext.close(),
      userContext.close(),
      managerContext.close(),
      adminContext.close(),
    ]);
    await browser.close();
  }

  return results;
}

async function runSecurityChecks(target) {
  const browser = await chromium.launch({ headless: true });
  const userContext = await createAuthedContext(browser, await loginViaApi(target, 'user'));
  const managerContext = await createAuthedContext(browser, await loginViaApi(target, 'manager'));
  const adminContext = await createAuthedContext(browser, await loginViaApi(target, 'admin'));

  const routes = [
    { role: 'user', route: '/manager/help', expectedPrefix: '/user/' },
    { role: 'user', route: '/admin/help', expectedPrefix: '/user/' },
    { role: 'manager', route: '/user/dashboard/help', expectedPrefix: '/manager/' },
    { role: 'manager', route: '/admin/help', expectedPrefix: '/manager/' },
    { role: 'admin', route: '/manager/help', expectedPrefix: '/admin/' },
    { role: 'admin', route: '/user/dashboard/help', expectedPrefix: '/admin/' },
  ];

  const contexts = {
    user: userContext,
    manager: managerContext,
    admin: adminContext,
  };

  const results = [];
  try {
    for (const item of routes) {
      const page = await contexts[item.role].newPage();
      const health = await collectPageHealth(page);
      await openPage(page, `${target.baseUrl}${item.route}`);
      results.push({
        role: item.role,
        route: item.route,
        actualUrl: new URL(page.url()).pathname,
        expectedPrefix: item.expectedPrefix,
        pageErrors: health.pageErrors,
        consoleErrors: health.consoleErrors,
        networkErrors: health.networkErrors,
      });
      await page.close();
    }

    const stalePage = await browser.newPage({ ignoreHTTPSErrors: true });
    const staleHealth = await collectPageHealth(stalePage);
    await stalePage.addInitScript(() => {
      localStorage.setItem('esto_token', 'invalid-token');
      localStorage.setItem('esto_user', JSON.stringify({
        id: 'stale-user',
        email: 'user@gmail.com',
        role: 'user',
        isAuthenticated: true,
      }));
    });
    await openPage(stalePage, `${target.baseUrl}/user/dashboard`);
    results.push({
      role: 'stale-user',
      route: '/user/dashboard',
      actualUrl: new URL(stalePage.url()).pathname,
      expectedPrefix: '/login',
      pageErrors: staleHealth.pageErrors,
      consoleErrors: filterExpectedStaleAuthConsoleErrors(staleHealth.consoleErrors),
      networkErrors: filterExpectedStaleAuthNetworkErrors(staleHealth.networkErrors),
    });
    await stalePage.close();
  } finally {
    await Promise.all([userContext.close(), managerContext.close(), adminContext.close()]);
    await browser.close();
  }

  return results;
}

async function runCompatibilityChecks(target) {
  const routes = [
    { role: 'user', route: '/user/dashboard/messages', session: await loginViaApi(target, 'user') },
    { role: 'manager', route: '/manager/fast-track', session: await loginViaApi(target, 'manager') },
    { role: 'admin', route: '/admin/help', session: await loginViaApi(target, 'admin') },
  ];

  const results = [];
  for (const item of routes) {
    const browser = await firefox.launch({ headless: true });
    const context = await createAuthedContext(browser, item.session);
    const page = await context.newPage();
    const health = await collectPageHealth(page);
    try {
      await openPage(page, `${target.baseUrl}${item.route}`);
      results.push({
        role: item.role,
        route: item.route,
        actualUrl: new URL(page.url()).pathname,
        textSample: (await page.locator('body').innerText()).slice(0, 160),
        pageErrors: health.pageErrors,
        consoleErrors: health.consoleErrors,
        networkErrors: health.networkErrors,
      });
    } finally {
      await context.close();
      await browser.close();
    }
  }

  return results;
}

async function runUtf8Checks(target) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    const health = await collectPageHealth(page);
    const candidates = [
      { route: '/contact', selector: 'textarea, input[type="text"]' },
      { route: '/register', selector: 'input[type="text"], textarea' },
    ];

    for (const candidate of candidates) {
      await openPage(page, `${target.baseUrl}${candidate.route}`);
      const input = page.locator(candidate.selector).first();
      if (await input.count()) {
        await input.fill(ANON_UTF8_TEXT);
        return {
          route: new URL(page.url()).pathname,
          entered: ANON_UTF8_TEXT,
          value: await input.inputValue(),
          pageErrors: health.pageErrors,
          consoleErrors: health.consoleErrors,
          networkErrors: health.networkErrors,
        };
      }
    }

    throw new Error('No stable UTF-8 text field was available on /contact or /register');
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  await ensureReachable(target.baseUrl);
  const artifactPath = buildArtifactPath(`platform-extra-${target.name}-proof.json`);

  const accessibility = await runAccessibilityChecks(target);
  const security = await runSecurityChecks(target);
  const compatibility = await runCompatibilityChecks(target);
  const utf8 = await runUtf8Checks(target);

  const scenarios = [];

  accessibility.forEach((item) => {
    scenarios.push(scenario(
      'accessibility',
      target.name,
      item.role,
      item.route,
      item.violations.length === 0
        && item.pageErrors.length === 0
        && item.consoleErrors.length === 0
        && item.networkErrors.length === 0
        && item.keyboardAfter.tag !== 'BODY',
      JSON.stringify({
        violations: item.violations,
        keyboardBefore: item.keyboardBefore,
        keyboardAfter: item.keyboardAfter,
      }),
      [...item.pageErrors, ...item.consoleErrors, ...item.networkErrors],
    ));
  });

  security.forEach((item) => {
    scenarios.push(scenario(
      'security',
      target.name,
      item.role,
      item.route,
      item.actualUrl.startsWith(item.expectedPrefix)
        && item.pageErrors.length === 0
        && item.consoleErrors.length === 0
        && item.networkErrors.length === 0,
      JSON.stringify({ actualUrl: item.actualUrl, expectedPrefix: item.expectedPrefix }),
      [...item.pageErrors, ...item.consoleErrors, ...item.networkErrors],
    ));
  });

  compatibility.forEach((item) => {
    scenarios.push(scenario(
      'compatibility-authenticated',
      target.name,
      item.role,
      item.route,
      item.actualUrl === item.route
        && item.pageErrors.length === 0
        && item.consoleErrors.length === 0
        && item.networkErrors.length === 0,
      JSON.stringify({ actualUrl: item.actualUrl, textSample: item.textSample }),
      [...item.pageErrors, ...item.consoleErrors, ...item.networkErrors],
    ));
  });

  scenarios.push(scenario(
    'localization-i18n',
    target.name,
    'anonymous',
    utf8.route,
    utf8.value === ANON_UTF8_TEXT
      && utf8.pageErrors.length === 0
      && utf8.consoleErrors.length === 0
      && utf8.networkErrors.length === 0,
    JSON.stringify({ route: utf8.route, entered: utf8.entered, value: utf8.value }),
    [...utf8.pageErrors, ...utf8.consoleErrors, ...utf8.networkErrors],
  ));

  const payload = {
    summary: {
      target: target.name,
      generatedAt: new Date().toISOString(),
      total: scenarios.length,
      passed: scenarios.filter((item) => item.status === 'passed').length,
      failed: scenarios.filter((item) => item.status === 'failed').length,
      overallOk: scenarios.every((item) => item.status === 'passed'),
    },
    accessibility,
    security,
    compatibility,
    utf8,
    scenarios,
  };

  fs.writeFileSync(artifactPath, JSON.stringify(payload, null, 2));
  if (!payload.summary.overallOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
