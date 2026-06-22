const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const crashPattern = /unexpected application error|something went wrong|application error|referenceerror|typeerror:|toast is not defined|cannot access .* before initialization/i;
const scopeLeakPattern = /\b(3d virtual tour|virtual tour|invoice|billing|payment workspace|payments workspace)\b/i;

const targets = {
  prod: {
    name: 'prod',
    appBaseUrl: process.env.E2E_PROD_APP_BASE_URL || process.env.E2E_PROD_BASE_URL || 'https://app.estospaces.com',
    adminBaseUrl: process.env.E2E_PROD_ADMIN_BASE_URL || 'https://admin.estospaces.com',
    coreUrl: process.env.E2E_PROD_CORE_URL || 'https://estospaces-core-service-prod-zaryfkxmeq-nw.a.run.app',
  },
  dev: {
    name: 'dev',
    appBaseUrl: process.env.E2E_DEV_APP_BASE_URL || process.env.E2E_DEV_BASE_URL || 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app',
    adminBaseUrl: process.env.E2E_DEV_ADMIN_BASE_URL || process.env.E2E_DEV_BASE_URL || 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app',
    coreUrl: process.env.E2E_DEV_CORE_URL || 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app',
  },
  local: {
    name: 'local',
    appBaseUrl: process.env.E2E_LOCAL_APP_BASE_URL || process.env.E2E_LOCAL_BASE_URL || 'http://localhost:3000',
    adminBaseUrl: process.env.E2E_LOCAL_ADMIN_BASE_URL || process.env.E2E_LOCAL_BASE_URL || 'http://localhost:3000',
    coreUrl: process.env.E2E_LOCAL_CORE_URL || 'http://localhost:8080',
  },
};

const roles = {
  user: {
    base: 'app',
    dashboard: '/user/dashboard',
    credentials: ['E2E_USER_EMAIL', 'E2E_USER_PASSWORD'],
    routes: [
      '/user/dashboard',
      '/search',
      '/user/saved',
      '/user/applications',
      '/user/dashboard/viewings',
      '/user/dashboard/notifications',
      '/user/dashboard/messages',
      '/user/dashboard/contracts',
      '/user/dashboard/profile',
      '/user/dashboard/settings',
      '/user/dashboard/help',
    ],
  },
  manager: {
    base: 'app',
    dashboard: '/manager/dashboard',
    credentials: ['E2E_MANAGER_EMAIL', 'E2E_MANAGER_PASSWORD'],
    routes: [
      '/manager/dashboard',
      '/manager/dashboard/properties',
      '/manager/dashboard/properties/add',
      '/manager/leads',
      '/manager/applications',
      '/manager/appointments',
      '/manager/messages',
      '/manager/notifications',
      '/manager/profile',
      '/manager/verification',
      '/manager/help',
      '/manager/fast-track',
    ],
  },
  admin: {
    base: 'admin',
    dashboard: '/admin/dashboard',
    credentials: ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'],
    routes: [
      '/admin/dashboard',
      '/admin/users',
      '/admin/properties',
      '/admin/verifications?entity=user',
      '/admin/help',
      '/admin/notifications',
      '/admin/settings',
    ],
  },
};

const publicChecks = [
  { label: 'app-login', base: 'app', route: '/login', expect: /sign in|email|password/i },
  { label: 'app-register', base: 'app', route: '/register', expect: /create|account|register|sign up/i },
  { label: 'app-search', base: 'app', route: '/search', expect: /search|property/i },
  { label: 'forgot-password', base: 'app', route: '/forgot-password', expect: /forgot|reset|email/i },
  { label: 'bad-reset-token', base: 'app', route: '/reset-password?token=bad-token', expect: /invalid|expired|reset|password|token/i },
  { label: 'bad-verify-token', base: 'app', route: '/verify-email?token=bad-token', expect: /invalid|expired|verify|email|token/i },
  { label: 'admin-login', base: 'admin', route: '/login', expect: /sign in|email|password/i },
];

const guardChecks = [
  { label: 'guard-user-dashboard', base: 'app', route: '/user/dashboard' },
  { label: 'guard-manager-dashboard', base: 'app', route: '/manager/dashboard' },
  { label: 'guard-manager-add-property', base: 'app', route: '/manager/dashboard/properties/add' },
  { label: 'guard-admin-dashboard', base: 'admin', route: '/admin/dashboard' },
  { label: 'guard-admin-users', base: 'admin', route: '/admin/users' },
];

function parseOption(argv, name) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === name && argv[index + 1]) return argv[index + 1];
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
  }
  return '';
}

function env(name) {
  return process.env[name] || '';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeName(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function resolveBaseUrl(target, base) {
  return base === 'admin' ? target.adminBaseUrl : target.appBaseUrl;
}

async function readBody(page) {
  return page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
}

function attachDiagnostics(page, bucket) {
  page.on('pageerror', (error) => bucket.pageErrors.push(String(error.message || error)));
  page.on('requestfailed', (request) => {
    if (/estospaces|localhost|127\.0\.0\.1/i.test(request.url())) {
      bucket.networkErrors.push({ failed: request.url(), error: request.failure()?.errorText || 'request failed' });
    }
  });
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      const text = message.text();
      if (!/^Failed to load resource:/i.test(text) && !/downloadable font/i.test(text)) {
        bucket.consoleMessages.push({ type: message.type(), text });
      }
    }
  });
  page.on('response', (response) => {
    const status = response.status();
    if ((status === 429 || status >= 500) && /estospaces|localhost|127\.0\.0\.1/i.test(response.url())) {
      bucket.networkErrors.push({ status, url: response.url() });
    }
  });
}

async function assertRendered(page, check) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  const deadline = Date.now() + 45000;
  let body = '';
  let lastReason = '';
  while (Date.now() < deadline) {
    body = await readBody(page);
    if (crashPattern.test(body)) {
      throw new Error(`Crash text detected for ${check.label || check.route}`);
    }
    if (body.trim().length < 30 || body.trim() === 'Loading...') {
      lastReason = `Rendered too little content for ${check.label || check.route}`;
      await page.waitForTimeout(750);
      continue;
    }
    if (check.expect && !check.expect.test(body)) {
      lastReason = `Expected text not found for ${check.label || check.route}`;
      await page.waitForTimeout(750);
      continue;
    }
    return body;
  }

  throw new Error(lastReason || `Page did not become ready for ${check.label || check.route}`);
}

async function runPublicOrGuardCheck(browser, target, check, outputDir, mode) {
  const diagnostics = { pageErrors: [], consoleMessages: [], networkErrors: [] };
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  attachDiagnostics(page, diagnostics);
  const url = `${resolveBaseUrl(target, check.base)}${check.route}`;
  const result = {
    mode,
    label: check.label,
    route: check.route,
    url,
    status: 'running',
    finalUrl: '',
    screenshot: '',
    diagnostics,
    scopeChecks: { outOfScopeText: [] },
  };

  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 45000 });
    const body = await assertRendered(page, mode === 'guard' ? { ...check, expect: /sign in|login|email|password|not authorized|access/i } : check);
    result.finalUrl = page.url();
    if (mode === 'guard') {
      const finalPath = new URL(result.finalUrl).pathname;
      const guardedPath = new URL(url).pathname;
      const looksGuarded = finalPath.includes('/login') || /sign in|login|not authorized|access/i.test(body);
      if (!looksGuarded || finalPath === guardedPath && !/sign in|login|not authorized|access/i.test(body)) {
        throw new Error(`Protected route did not show an auth guard: ${result.finalUrl}`);
      }
    }
    const leaks = body.match(scopeLeakPattern);
    result.scopeChecks.outOfScopeText = leaks ? [leaks[0]] : [];
    if (leaks) {
      throw new Error(`Out-of-scope text visible: ${leaks[0]}`);
    }
    result.screenshot = path.join(outputDir, `${safeName(`${mode}-${check.label}`)}.png`);
    await page.screenshot({ path: result.screenshot, fullPage: true });
    result.status = diagnostics.pageErrors.length || diagnostics.networkErrors.length || diagnostics.consoleMessages.length ? 'failed' : 'passed';
    if (result.status === 'failed') result.error = 'Browser diagnostics contained errors';
  } catch (error) {
    result.status = 'failed';
    result.error = error.message;
    result.finalUrl = page.url();
    result.screenshot = path.join(outputDir, `${safeName(`${mode}-${check.label}`)}-failure.png`);
    await page.screenshot({ path: result.screenshot, fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
  return result;
}

async function loginViaApi(target, roleName) {
  const role = roles[roleName];
  const [emailEnv, passwordEnv] = role.credentials;
  const email = env(emailEnv);
  const password = env(passwordEnv);
  if (!email || !password) {
    return { blocked: true, reason: `Missing ${emailEnv}/${passwordEnv}` };
  }

  const response = await fetch(`${target.coreUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`API login failed for ${roleName}: ${response.status} ${payload?.message || payload?.error || ''}`.trim());
  }
  const token = payload?.data?.token || payload?.token;
  const rawUser = payload?.data?.user || payload?.user;
  if (!token || !rawUser?.id) {
    throw new Error(`API login did not return token/user for ${roleName}`);
  }
  const fullName = [rawUser.first_name, rawUser.last_name].filter(Boolean).join(' ').trim() || rawUser.email || roleName;
  return {
    token,
    user: {
      id: String(rawUser.id),
      email: String(rawUser.email || email),
      name: fullName,
      role: String(rawUser.role || roleName),
      isAuthenticated: true,
      first_name: rawUser.first_name || undefined,
      last_name: rawUser.last_name || undefined,
      user_metadata: { full_name: fullName },
    },
  };
}

async function createAuthedContext(browser, baseUrl, session) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, ignoreHTTPSErrors: true });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('esto_token', token);
    localStorage.setItem('esto_user', JSON.stringify(user));
  }, session);
  await context.addCookies([]);
  return context;
}

async function runRoleRoute(browser, target, roleName, session, route, outputDir) {
  const role = roles[roleName];
  const baseUrl = resolveBaseUrl(target, role.base);
  const diagnostics = { pageErrors: [], consoleMessages: [], networkErrors: [] };
  const context = await createAuthedContext(browser, baseUrl, session);
  const page = await context.newPage();
  attachDiagnostics(page, diagnostics);
  const url = `${baseUrl}${route}`;
  const result = {
    mode: 'authenticated',
    role: roleName,
    route,
    url,
    status: 'running',
    finalUrl: '',
    screenshot: '',
    diagnostics,
    scopeChecks: {
      indiaOrRupeeSignal: 'not_checked',
      outOfScopeText: [],
    },
  };

  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 45000 });
    const body = await assertRendered(page, { route });
    result.finalUrl = page.url();
    const finalPath = new URL(result.finalUrl).pathname;
    const expectedPath = new URL(url).pathname;
    if (!finalPath.startsWith(expectedPath)) {
      throw new Error(`Expected ${expectedPath}, landed on ${result.finalUrl}`);
    }
    const leaks = body.match(scopeLeakPattern);
    result.scopeChecks.outOfScopeText = leaks ? [leaks[0]] : [];
    result.scopeChecks.indiaOrRupeeSignal = /\b(inr|rs\.?|rupee|india|mumbai|bangalore|bengaluru|chennai|hyderabad|delhi|pune)\b/i.test(body)
      ? 'present'
      : 'not_visible';
    if (leaks) {
      throw new Error(`Out-of-scope text visible: ${leaks[0]}`);
    }
    result.screenshot = path.join(outputDir, `${safeName(`${roleName}-${route}`)}.png`);
    await page.screenshot({ path: result.screenshot, fullPage: true });
    result.status = diagnostics.pageErrors.length || diagnostics.networkErrors.length || diagnostics.consoleMessages.length ? 'failed' : 'passed';
    if (result.status === 'failed') result.error = 'Browser diagnostics contained errors';
  } catch (error) {
    result.status = 'failed';
    result.error = error.message;
    result.finalUrl = page.url();
    result.screenshot = path.join(outputDir, `${safeName(`${roleName}-${route}`)}-failure.png`);
    await page.screenshot({ path: result.screenshot, fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
  return result;
}

async function runSearchInteraction(browser, target, outputDir) {
  const diagnostics = { pageErrors: [], consoleMessages: [], networkErrors: [] };
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  attachDiagnostics(page, diagnostics);
  const result = {
    mode: 'interaction',
    label: 'public-search-keyword-toggle',
    status: 'running',
    url: `${target.appBaseUrl}/search`,
    finalUrl: '',
    screenshot: '',
    diagnostics,
  };

  try {
    await page.goto(result.url, { waitUntil: 'commit', timeout: 45000 });
    await assertRendered(page, { route: '/search', expect: /search|property/i });
    const search = page.locator('input[type="search"], input[placeholder*="Search" i], input[placeholder*="location" i]').first();
    if (await search.count()) {
      await search.fill('Bangalore');
      await search.press('Enter').catch(() => {});
      await page.waitForFunction(() => !/Searching properties/i.test(document.body.innerText), null, { timeout: 45000 }).catch(() => {});
    }
    const filterButton = page.getByRole('button', { name: /filter/i }).first();
    if (await filterButton.count()) {
      await filterButton.click();
      await page.waitForTimeout(500);
    }
    result.finalUrl = page.url();
    result.screenshot = path.join(outputDir, 'interaction-public-search.png');
    await page.screenshot({ path: result.screenshot, fullPage: true });
    result.status = diagnostics.pageErrors.length || diagnostics.networkErrors.length || diagnostics.consoleMessages.length ? 'failed' : 'passed';
    if (result.status === 'failed') result.error = 'Browser diagnostics contained errors';
  } catch (error) {
    result.status = 'failed';
    result.error = error.message;
    result.finalUrl = page.url();
    result.screenshot = path.join(outputDir, 'interaction-public-search-failure.png');
    await page.screenshot({ path: result.screenshot, fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
  return result;
}

async function main() {
  const argv = process.argv.slice(2);
  const targetName = parseOption(argv, '--target') || 'prod';
  const target = targets[targetName];
  if (!target) throw new Error(`Unknown target: ${targetName}`);
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(process.cwd(), 'outputs', 'current-release-proof', `manual-important-regression-${target.name}-${runId}`);
  ensureDir(outputDir);

  const report = {
    runId,
    target,
    scope: {
      included: ['unauthenticated', 'user', 'manager', 'admin', 'route guards', 'critical app/admin pages', 'search interaction'],
      excluded: ['landing pages', 'cybersecurity/destructive tests', '3D/virtual tour', 'payments/invoices workspace'],
    },
    startedAt: new Date().toISOString(),
    results: [],
    roleSessions: {},
    summary: { passed: 0, failed: 0, blocked: 0 },
  };

  const browser = await chromium.launch({ headless: true });
  try {
    for (const check of publicChecks) {
      report.results.push(await runPublicOrGuardCheck(browser, target, check, outputDir, 'public'));
    }
    report.results.push(await runSearchInteraction(browser, target, outputDir));
    for (const check of guardChecks) {
      report.results.push(await runPublicOrGuardCheck(browser, target, check, outputDir, 'guard'));
    }

    for (const roleName of Object.keys(roles)) {
      let session = null;
      try {
        session = await loginViaApi(target, roleName);
      } catch (error) {
        report.roleSessions[roleName] = { status: 'failed', error: error.message };
        report.results.push({
          mode: 'authenticated',
          role: roleName,
          route: 'login',
          status: 'failed',
          error: error.message,
        });
        continue;
      }
      if (session.blocked) {
        report.roleSessions[roleName] = { status: 'blocked', reason: session.reason };
        report.results.push({
          mode: 'authenticated',
          role: roleName,
          route: 'login',
          status: 'blocked',
          reason: session.reason,
        });
        continue;
      }
      report.roleSessions[roleName] = { status: 'passed' };
      for (const route of roles[roleName].routes) {
        report.results.push(await runRoleRoute(browser, target, roleName, session, route, outputDir));
      }
    }
  } finally {
    await browser.close();
  }

  for (const result of report.results) {
    if (result.status === 'passed') report.summary.passed += 1;
    else if (result.status === 'blocked') report.summary.blocked += 1;
    else report.summary.failed += 1;
  }
  report.completedAt = new Date().toISOString();

  const jsonPath = path.join(outputDir, 'manual-important-regression-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  const bugList = report.results
    .filter((result) => result.status === 'failed')
    .map((result) => `- ${result.mode}${result.role ? `/${result.role}` : ''} ${result.route || result.label}: ${result.error || 'failed'}`)
    .join('\n') || '- No failed checks in executed scope.';
  const blockedList = report.results
    .filter((result) => result.status === 'blocked')
    .map((result) => `- ${result.role || result.label}: ${result.reason}`)
    .join('\n') || '- No blocked checks.';
  const mdPath = path.join(outputDir, 'manual-important-regression-summary.md');
  fs.writeFileSync(mdPath, [
    '# Manual Important Regression Gate',
    '',
    `Target: ${target.name}`,
    `Completed: ${report.completedAt}`,
    `Passed: ${report.summary.passed}`,
    `Failed: ${report.summary.failed}`,
    `Blocked: ${report.summary.blocked}`,
    '',
    '## Exclusions',
    '- Landing pages',
    '- Cybersecurity/destructive tests',
    '- 3D/virtual tour',
    '- Payments/invoices workspace',
    '',
    '## Failed Checks',
    bugList,
    '',
    '## Blocked Checks',
    blockedList,
    '',
  ].join('\n'));

  console.log(JSON.stringify({ jsonPath, mdPath, summary: report.summary }, null, 2));
  if (report.summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
