const fs = require('node:fs');
const { chromium } = require('playwright');
const {
  buildArtifactPath,
  credentials,
  ensureReachable,
  getRoleBaseUrl,
  resolveTarget,
  requireEnv,
} = require('./platform-proof-shared.cjs');

function hostLabel(url) {
  return new URL(url).host;
}

function resolveCredential(roleName) {
  const role = credentials[roleName];
  const email = requireEnv(role.emailEnv);
  const password = requireEnv(role.passwordEnv);
  return { email, password };
}

async function attachDiagnostics(page, errors) {
  page.on('pageerror', (error) => errors.page.push(String(error)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!/^Failed to load resource:/i.test(text)) {
        errors.console.push(text);
      }
    }
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && !/favicon|manifest|apple-touch-icon/i.test(url)) {
      errors.network.push(`${response.status()} ${url}`);
    }
  });
}

async function waitForLoginUi(page, timeout = 30000) {
  await page.locator('input[name="email"], input[type="email"]').first().waitFor({ state: 'visible', timeout });
  await page.locator('input[name="password"], input[type="password"]').first().waitFor({ state: 'visible', timeout });
}

async function submitLogin(page, baseUrl, email, password, timeout = 120000) {
  await page.goto(`${baseUrl}/login/`, { waitUntil: 'domcontentloaded', timeout });
  await waitForLoginUi(page, timeout);
  await page.locator('input[name="email"], input[type="email"]').first().fill(email);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
}

async function runScenario(name, task) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const errors = { page: [], console: [], network: [] };
  await attachDiagnostics(page, errors);

  const result = {
    name,
    status: 'failed',
    actualUrl: '',
    pageErrors: errors.page,
    consoleErrors: errors.console,
    networkErrors: errors.network,
  };

  try {
    await task(page, result);
    result.actualUrl = page.url();
    result.status = errors.page.length === 0 && errors.console.length === 0 && errors.network.length === 0 ? 'passed' : 'failed';
    if (result.status !== 'passed' && !result.error) {
      result.error = 'Browser diagnostics detected';
    }
  } catch (error) {
    result.actualUrl = page.url();
    result.error = String(error);
    result.status = 'failed';
  } finally {
    await context.close();
    await browser.close();
  }

  return result;
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  const appBaseUrl = getRoleBaseUrl(target, 'user');
  const adminBaseUrl = getRoleBaseUrl(target, 'admin');
  const artifactPath = buildArtifactPath(`auth-host-${target.name}-proof.json`);

  await ensureReachable(appBaseUrl);
  await ensureReachable(adminBaseUrl);

  const results = [];
  const testCredentials = {
    user: resolveCredential('user'),
    manager: resolveCredential('manager'),
    admin: resolveCredential('admin'),
  };

  const scenarios = [
    {
      name: 'app-login-page',
      fn: async (page, result) => {
        await page.goto(`${appBaseUrl}/login/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForLoginUi(page, 60000);
        if (hostLabel(page.url()) !== hostLabel(appBaseUrl)) {
          throw new Error(`Expected app host ${hostLabel(appBaseUrl)} but landed on ${page.url()}`);
        }
        result.expectedHost = hostLabel(appBaseUrl);
      },
    },
    {
      name: 'admin-login-page',
      fn: async (page, result) => {
        await page.goto(`${adminBaseUrl}/login/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForLoginUi(page, 60000);
        if (hostLabel(page.url()) !== hostLabel(adminBaseUrl)) {
          throw new Error(`Expected admin host ${hostLabel(adminBaseUrl)} but landed on ${page.url()}`);
        }
        result.expectedHost = hostLabel(adminBaseUrl);
      },
    },
    {
      name: 'user-login-on-app-host',
      fn: async (page, result) => {
        await submitLogin(page, appBaseUrl, testCredentials.user.email, testCredentials.user.password, 120000);
        await page.waitForURL((url) => url.hostname === new URL(appBaseUrl).hostname && url.pathname.startsWith('/user/dashboard'), { timeout: 120000 });
        result.expectedHost = hostLabel(appBaseUrl);
        result.expectedPathPrefix = '/user/dashboard';
      },
    },
    {
      name: 'manager-login-on-app-host',
      fn: async (page, result) => {
        await submitLogin(page, appBaseUrl, testCredentials.manager.email, testCredentials.manager.password, 120000);
        await page.waitForURL((url) => url.hostname === new URL(appBaseUrl).hostname && url.pathname.startsWith('/manager/dashboard'), { timeout: 120000 });
        result.expectedHost = hostLabel(appBaseUrl);
        result.expectedPathPrefix = '/manager/dashboard';
      },
    },
    {
      name: 'admin-login-on-app-host-redirects-to-admin-login',
      fn: async (page, result) => {
        await submitLogin(page, appBaseUrl, testCredentials.admin.email, testCredentials.admin.password, 120000);
        await page.waitForURL((url) => url.hostname === new URL(adminBaseUrl).hostname && url.pathname.startsWith('/login'), { timeout: 120000 });
        await waitForLoginUi(page, 30000);
        result.expectedHost = hostLabel(adminBaseUrl);
        result.expectedPathPrefix = '/login';
      },
    },
    {
      name: 'admin-login-on-admin-host',
      fn: async (page, result) => {
        await submitLogin(page, adminBaseUrl, testCredentials.admin.email, testCredentials.admin.password, 120000);
        await page.waitForURL((url) => url.hostname === new URL(adminBaseUrl).hostname && url.pathname.startsWith('/admin/dashboard'), { timeout: 120000 });
        result.expectedHost = hostLabel(adminBaseUrl);
        result.expectedPathPrefix = '/admin/dashboard';
      },
    },
    {
      name: 'manager-login-on-admin-host-redirects-to-app-login',
      fn: async (page, result) => {
        await submitLogin(page, adminBaseUrl, testCredentials.manager.email, testCredentials.manager.password, 120000);
        await page.waitForURL((url) => url.hostname === new URL(appBaseUrl).hostname && url.pathname.startsWith('/login'), { timeout: 120000 });
        await waitForLoginUi(page, 30000);
        result.expectedHost = hostLabel(appBaseUrl);
        result.expectedPathPrefix = '/login';
      },
    },
    {
      name: 'user-login-on-admin-host-redirects-to-app-login',
      fn: async (page, result) => {
        await submitLogin(page, adminBaseUrl, testCredentials.user.email, testCredentials.user.password, 120000);
        await page.waitForURL((url) => url.hostname === new URL(appBaseUrl).hostname && url.pathname.startsWith('/login'), { timeout: 120000 });
        await waitForLoginUi(page, 30000);
        result.expectedHost = hostLabel(appBaseUrl);
        result.expectedPathPrefix = '/login';
      },
    },
  ];

  // Run each scenario in its own browser instance to prevent OOM crashes
  for (const scenario of scenarios) {
    console.error(`[auth-host] running: ${scenario.name}`);
    results.push(await runScenario(scenario.name, scenario.fn));
  }

  const payload = {
    target: target.name,
    appBaseUrl,
    adminBaseUrl,
    steps: results,
    overallOk: results.every((item) => item.status === 'passed'),
  };

  fs.writeFileSync(artifactPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.overallOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
