const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  extractVirtualTourIdFromUrl,
  normalizeRoute,
  roleForRoute,
  rolesNeededForScenarios,
} = require('./live-1000-route-resolver.cjs');

const crashPattern = /page failed to load|unexpected application error|something went wrong|application error|referenceerror|typeerror:|toast is not defined|cannot access .* before initialization/i;
const DEV_WEB_BASE_URL = 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';

function readFrontendUrlFromEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    return '';
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const [key, ...valueParts] = line.split('=');
    if (key === 'FRONTEND_URL') {
      return valueParts.join('=').trim();
    }
  }

  return '';
}

const baseUrl = process.env.E2E_DEV_BASE_URL
  || readFrontendUrlFromEnvFile('.env.development')
  || readFrontendUrlFromEnvFile('.env.gcp-dev')
  || DEV_WEB_BASE_URL;
const coreUrl = process.env.E2E_DEV_CORE_URL || 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app';
const docPath = path.resolve(__dirname, '..', '..', 'docs', 'test-plans', '11-05-2026_test.md');
const outputRoot = path.resolve(__dirname, '..', 'output', 'playwright', 'live-1000');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(outputRoot, `dev-${runId}`);
const scenarioTimeoutMs = Number(process.env.LIVE_1000_TIMEOUT_MS || 20000);
const workerCount = Math.max(1, Number(process.env.LIVE_1000_WORKERS || 3));

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const credentials = {
  user: {
    email: requireEnv('E2E_USER_EMAIL'),
    password: requireEnv('E2E_USER_PASSWORD'),
  },
  manager: {
    email: requireEnv('E2E_MANAGER_EMAIL'),
    password: requireEnv('E2E_MANAGER_PASSWORD'),
  },
  admin: {
    email: requireEnv('E2E_ADMIN_EMAIL'),
    password: requireEnv('E2E_ADMIN_PASSWORD'),
  },
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function parseScenarioBlocks(markdown) {
  const headingPattern = /^### (TC-\d{4}) - (.+)$/gm;
  const headings = [];
  let match;
  while ((match = headingPattern.exec(markdown)) !== null) {
    headings.push({
      id: match[1],
      title: match[2].trim(),
      start: match.index,
      contentStart: headingPattern.lastIndex,
    });
  }

  return headings.map((heading, index) => {
    const end = index + 1 < headings.length ? headings[index + 1].start : markdown.length;
    const body = markdown.slice(heading.contentStart, end);
    const role = body.match(/- \*\*Role:\*\*\s*([^\n]+)/)?.[1]?.trim() || 'Public/Auth';
    const priority = body.match(/- \*\*Priority:\*\*\s*([^\n]+)/)?.[1]?.trim() || '';
    const testType = body.match(/- \*\*Test type:\*\*\s*([^\n]+)/)?.[1]?.trim() || '';
    const dataSetup = body.match(/- \*\*Data\/setup:\*\*\s*([\s\S]*?)(?:\n- \*\*Steps:\*\*|\n\d+\.|\n- \*\*Expected result:\*\*)/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
    const routes = extractRoutes(dataSetup);

    return {
      id: heading.id,
      title: heading.title,
      role,
      priority,
      test_type: testType,
      data_setup: dataSetup,
      routes,
    };
  });
}

function extractRoutes(dataSetup) {
  const routes = [];
  const routeSurface = dataSetup.match(/Route\/surface:\s*(.+?)(?:\. Service focus:|\. Data\/setup:|$)/i)?.[1] || '';
  const candidates = [...routeSurface.matchAll(/`([^`]+)`/g)].map((item) => item[1]);
  if (candidates.length === 0 && routeSurface.trim().startsWith('/')) {
    candidates.push(routeSurface.trim());
  }

  for (const candidate of candidates) {
    for (const part of candidate.split(/\s*->\s*/)) {
      const route = part.trim();
      if (route && route.startsWith('/')) {
        routes.push(route);
      }
    }
  }

  return [...new Set(routes)];
}

function storageStateFor(base, session) {
  if (!session) {
    return { cookies: [], origins: [] };
  }

  return {
    cookies: [],
    origins: [
      {
        origin: new URL(base).origin,
        localStorage: [
          { name: 'esto_token', value: session.token },
          { name: 'esto_user', value: JSON.stringify(session.user) },
        ],
      },
    ],
  };
}

function buildStoredUser(rawUser, fallbackEmail, fallbackRole) {
  const email = String(rawUser?.email || fallbackEmail || '').trim();
  const firstName = String(rawUser?.first_name || '').trim();
  const lastName = String(rawUser?.last_name || '').trim();
  const name = `${firstName} ${lastName}`.trim() || rawUser?.name || email.split('@')[0] || fallbackRole;
  return {
    id: String(rawUser?.id || ''),
    email,
    name,
    role: String(rawUser?.role || fallbackRole),
    isAuthenticated: true,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
  };
}

async function login(role) {
  const credential = credentials[role];
  const response = await fetch(`${coreUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credential),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Login failed for ${role}: ${response.status} ${JSON.stringify(payload)}`);
  }
  const token = payload?.token || payload?.data?.token;
  const user = payload?.user || payload?.data?.user;
  if (!token) {
    throw new Error(`Login did not return token for ${role}`);
  }
  return { token, user: buildStoredUser(user, credential.email, role) };
}

async function resolveSeedIds(adminSession) {
  const ids = {};
  const publicProperties = await fetch(`${coreUrl}/api/v1/properties?page=1&limit=1`).then((res) => res.json()).catch(() => null);
  const publicProperty = publicProperties?.data?.data?.[0] || publicProperties?.data?.[0] || null;
  ids.propertyId = publicProperty?.id || '';
  ids.virtualTourId = extractVirtualTourIdFromUrl(publicProperty?.virtual_tour_url);

  if (adminSession?.token) {
    const headers = { Authorization: `Bearer ${adminSession.token}` };
    const adminProperties = await fetch(`${coreUrl}/api/v1/admin/properties?limit=1`, { headers }).then((res) => res.json()).catch(() => null);
    const adminProperty = adminProperties?.data?.data?.[0] || null;
    ids.adminPropertyId = adminProperty?.id || ids.propertyId;
    ids.virtualTourId = ids.virtualTourId || extractVirtualTourIdFromUrl(adminProperty?.virtual_tour_url);
  }

  return ids;
}

async function waitForMeaningfulBody(page) {
  const deadline = Date.now() + Math.min(10000, scenarioTimeoutMs);
  while (Date.now() < deadline) {
    const body = await page.locator('body').innerText({ timeout: 1000 }).catch(() => '');
    if (body.trim().length >= 20) {
      return body;
    }
    await page.waitForTimeout(300);
  }
  return page.locator('body').innerText({ timeout: 1000 }).catch(() => '');
}

async function runRoute(browser, sessions, ids, scenario, route) {
  const resolvedRoute = normalizeRoute(route, ids);
  const role = roleForRoute(resolvedRoute, scenario.role);
  const session = role === 'public' ? null : sessions[role];
  const context = await browser.newContext({
    storageState: storageStateFor(baseUrl, session),
    viewport: scenario.id.localeCompare('TC-0500') < 0 ? { width: 1440, height: 960 } : { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    failedRequests.push(`${request.method()} ${request.url()} ${failure?.errorText || ''}`.trim());
  });

  const startedAt = Date.now();
  try {
    const url = new URL(resolvedRoute, baseUrl).toString();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: scenarioTimeoutMs });
    const body = await waitForMeaningfulBody(page);
    const finalUrl = page.url();
    const status = response?.status() || 0;
    const crashed = crashPattern.test(body) || pageErrors.some((item) => crashPattern.test(item));
    const loginUnexpected = role !== 'public' && new URL(finalUrl).pathname.startsWith('/login');
    const emptyBody = body.trim().length < 20;
    const failed = crashed || loginUnexpected || emptyBody || status >= 500;

    return {
      route,
      resolved_route: resolvedRoute,
      role,
      status: failed ? 'failed' : 'passed',
      http_status: status,
      final_url: finalUrl,
      duration_ms: Date.now() - startedAt,
      body_excerpt: body.replace(/\s+/g, ' ').slice(0, 220),
      page_errors: pageErrors.slice(0, 5),
      console_errors: consoleErrors.slice(0, 5),
      failed_requests: failedRequests.slice(0, 5),
      failure_reason: crashed
        ? 'crash pattern or page error'
        : loginUnexpected
          ? 'protected route redirected to login'
          : emptyBody
            ? 'body did not render meaningful content'
            : status >= 500
              ? `server status ${status}`
              : '',
    };
  } catch (error) {
    const screenshotPath = path.join(outputDir, 'failures', `${scenario.id}-${resolvedRoute.replace(/[^a-z0-9]+/gi, '_')}.png`);
    ensureDir(path.dirname(screenshotPath));
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    return {
      route,
      resolved_route: resolvedRoute,
      role,
      status: 'failed',
      http_status: 0,
      final_url: page.url(),
      duration_ms: Date.now() - startedAt,
      body_excerpt: '',
      page_errors: pageErrors.slice(0, 5),
      console_errors: consoleErrors.slice(0, 5),
      failed_requests: failedRequests.slice(0, 5),
      failure_reason: error.message,
      screenshot: fs.existsSync(screenshotPath) ? screenshotPath : '',
    };
  } finally {
    await context.close().catch(() => {});
  }
}

async function worker(workerId, queue, browser, sessions, ids, results) {
  while (queue.length > 0) {
    const scenario = queue.shift();
    const routes = scenario.routes.length > 0 ? scenario.routes : ['/'];
    const routeResults = [];
    for (const route of routes) {
      routeResults.push(await runRoute(browser, sessions, ids, scenario, route));
    }
    const failedRoute = routeResults.find((item) => item.status === 'failed');
    const result = {
      ...scenario,
      status: failedRoute ? 'failed' : 'passed',
      route_results: routeResults,
      worker_id: workerId,
    };
    results.push(result);
    if (results.length % 25 === 0 || failedRoute) {
      const completed = results.length;
      const failed = results.filter((item) => item.status === 'failed').length;
      console.log(JSON.stringify({ completed, failed, latest: scenario.id, status: result.status }));
    }
  }
}

function summarize(results, scenarios) {
  const failed = results.filter((item) => item.status === 'failed');
  const passed = results.filter((item) => item.status === 'passed');
  const byRole = {};
  for (const item of results) {
    byRole[item.role] ||= { passed: 0, failed: 0 };
    byRole[item.role][item.status] += 1;
  }
  return {
    run_id: runId,
    environment: 'dev',
    base_url: baseUrl,
    scenario_count_expected: scenarios.length,
    scenario_count_executed: results.length,
    passed: passed.length,
    failed: failed.length,
    by_role: byRole,
    output_dir: outputDir,
  };
}

async function main() {
  ensureDir(outputDir);
  const markdown = fs.readFileSync(docPath, 'utf8');
  let scenarios = parseScenarioBlocks(markdown);
  if (scenarios.length !== 1000) {
    throw new Error(`Expected 1000 scenarios, parsed ${scenarios.length}`);
  }
  if (process.env.LIVE_1000_SCENARIO) {
    scenarios = scenarios.filter((scenario) => scenario.id === process.env.LIVE_1000_SCENARIO);
    if (scenarios.length !== 1) {
      throw new Error(`Scenario not found: ${process.env.LIVE_1000_SCENARIO}`);
    }
  }

  const sessions = {};
  for (const role of rolesNeededForScenarios(scenarios)) {
    sessions[role] = await login(role);
  }
  const ids = await resolveSeedIds(sessions.admin);
  const browser = await chromium.launch({
    args: ['--disable-quic'],
    headless: process.env.LIVE_1000_HEADED !== '1',
  });
  const queue = [...scenarios];
  const results = [];

  try {
    await Promise.all(
      Array.from({ length: workerCount }, (_, index) => worker(index + 1, queue, browser, sessions, ids, results)),
    );
  } finally {
    await browser.close().catch(() => {});
  }

  results.sort((left, right) => left.id.localeCompare(right.id));
  const summary = summarize(results, scenarios);
  writeJson(path.join(outputDir, 'results.json'), results);
  writeJson(path.join(outputDir, 'summary.json'), summary);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
