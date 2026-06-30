const fs = require('node:fs');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const {
  buildArtifactPath,
  createAuthedContext,
  ensureReachable,
  getRoleBaseUrl,
  loginViaApi,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

const crashPattern = /unexpected application error|something went wrong|application error|referenceerror|typeerror|failed to submit property/i;
const hiddenTargetPattern = /favicon|manifest|apple-touch-icon|googleapis|gstatic|maps\.google|tile\.openstreetmap/i;

function parsePropertyList(payload) {
  const candidates = [
    payload?.data?.data,
    payload?.data,
    payload?.properties,
  ];

  return candidates.find(Array.isArray) || [];
}

async function getPropertyFixture(target, adminSession) {
  const response = await fetch(`${target.services.core}/api/v1/admin/properties`, {
    headers: {
      Authorization: `Bearer ${adminSession.token}`,
    },
  });
  const payload = await response.json();
  const properties = parsePropertyList(payload);
  if (!response.ok || properties.length === 0) {
    throw new Error(`Unable to load property fixtures: ${response.status}`);
  }

  const publicProperty = properties.find((property) => (
    property.id
    && ['published', 'online', 'active', 'sold'].includes(String(property.status || '').toLowerCase())
  )) || properties.find((property) => property.id);

  return {
    publicPropertyId: publicProperty.id,
    managerPropertyId: properties.find((property) => property.id)?.id,
    adminPropertyId: properties.find((property) => property.id)?.id,
  };
}

function setupPageWatchers(page) {
  const pageErrors = [];
  const consoleErrors = [];
  const networkErrors = [];

  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return;
    }
    const text = message.text();
    if (/^Failed to load resource:/i.test(text)) {
      return;
    }
    consoleErrors.push(text);
  });
  page.on('response', (response) => {
    const url = response.url();
    if (hiddenTargetPattern.test(url)) {
      return;
    }
    if (response.status() >= 500) {
      networkErrors.push(`${response.status()} ${url}`);
    }
  });

  return { pageErrors, consoleErrors, networkErrors };
}

async function assertHealthy(page, label, requiredTexts = []) {
  await page.waitForLoadState('domcontentloaded', { timeout: 120000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForFunction(() => (document.body?.innerText || '').trim().length > 80, null, { timeout: 20000 });

  const bodyText = await page.locator('body').innerText();
  if (crashPattern.test(bodyText)) {
    throw new Error(`Crash text detected on ${label}`);
  }
  for (const text of requiredTexts) {
    if (!bodyText.toLowerCase().includes(text.toLowerCase())) {
      throw new Error(`Missing expected text "${text}" on ${label}`);
    }
  }
}

async function assertNoSevereAxeIssues(page, label) {
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const severe = results.violations.filter((violation) => (
    violation.impact === 'serious' || violation.impact === 'critical'
  ));
  if (severe.length > 0) {
    const details = severe.map((violation) => {
      const nodes = violation.nodes.slice(0, 3).map((node) => {
        const target = node.target.join(' | ');
        const html = node.html.replace(/\s+/g, ' ').slice(0, 220);
        return `${target}: ${html}`;
      }).join(' || ');
      return `${violation.id} (${violation.impact}) ${nodes}`;
    }).join(' ;; ');
    throw new Error(`${label} has severe accessibility issues: ${details}`);
  }
}

async function withPage(browser, session, viewport, run) {
  const context = session
    ? await createAuthedContext(browser, session)
    : await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  if (session) {
    await context.setDefaultTimeout(20000);
    await context.setDefaultNavigationTimeout(120000);
  }
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(120000);
  const watchers = setupPageWatchers(page);
  try {
    await run(page, watchers);
    return {
      pageErrors: watchers.pageErrors,
      consoleErrors: watchers.consoleErrors,
      networkErrors: watchers.networkErrors,
    };
  } finally {
    await context.close();
  }
}

async function pass(results, name, run) {
  try {
    const details = await run();
    results.push({ name, status: 'passed', ...details });
  } catch (error) {
    results.push({ name, status: 'failed', error: String(error) });
  }
}

async function clickIfVisible(page, locator) {
  if (await locator.count()) {
    const first = locator.first();
    if (await first.isVisible().catch(() => false)) {
      await first.click();
      return true;
    }
  }
  return false;
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  const artifactPath = buildArtifactPath(`discovery-inventory-${target.name}-proof.json`);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  const desktop = { width: 1440, height: 960 };
  const mobile = { width: 390, height: 844 };

  try {
    await ensureReachable(target.baseUrl);
    const userSession = await loginViaApi(target, 'user');
    const managerSession = await loginViaApi(target, 'manager');
    const adminSession = await loginViaApi(target, 'admin');
    const fixture = await getPropertyFixture(target, adminSession);

    await pass(results, 'public search route desktop', () => withPage(browser, null, desktop, async (page, watchers) => {
      await page.goto(`${target.baseUrl}/search?q=london`);
      await assertHealthy(page, '/search', ['Find Your Property']);
      await page.getByLabel('Search properties').fill('London');
      await clickIfVisible(page, page.getByRole('button', { name: /filters/i }));
      await page.getByRole('button', { name: /apply filters/i }).click();
      await assertNoSevereAxeIssues(page, 'public search route desktop');
      return watchers;
    }));

    for (const viewport of [desktop, mobile]) {
      const suffix = viewport === desktop ? 'desktop' : 'mobile';
      const userBaseUrl = getRoleBaseUrl(target, 'user');
      await pass(results, `user search route ${suffix}`, () => withPage(browser, userSession, viewport, async (page, watchers) => {
        await page.goto(`${userBaseUrl}/user/search?q=london`);
        await assertHealthy(page, '/user/search', ['Find Your Property', 'properties found']);
        await page.getByLabel('Search properties').fill('london');
        await clickIfVisible(page, page.getByRole('button', { name: /show list view/i }));
        await clickIfVisible(page, page.getByRole('button', { name: /show grid view/i }));
        await clickIfVisible(page, page.getByRole('button', { name: /^filters$/i }));
        await page.getByRole('button', { name: /apply filters/i }).click();
        await assertNoSevereAxeIssues(page, `user search route ${suffix}`);
        return watchers;
      }));

      await pass(results, `saved homes route ${suffix}`, () => withPage(browser, userSession, viewport, async (page, watchers) => {
        await page.goto(`${userBaseUrl}/user/saved`);
        await assertHealthy(page, '/user/saved', ['Saved']);
        await clickIfVisible(page, page.getByRole('button', { name: /searches/i }));
        await assertNoSevereAxeIssues(page, `saved homes route ${suffix}`);
        return watchers;
      }));

      await pass(results, `favorites alias route ${suffix}`, () => withPage(browser, userSession, viewport, async (page, watchers) => {
        await page.goto(`${userBaseUrl}/user/favorites?tab=searches`);
        await assertHealthy(page, '/user/favorites', ['Saved']);
        if (!new URL(page.url()).pathname.startsWith('/user/saved')) {
          throw new Error(`Favorites alias did not redirect to saved route: ${page.url()}`);
        }
        return watchers;
      }));
    }

    await pass(results, 'user property detail desktop', () => withPage(browser, userSession, desktop, async (page, watchers) => {
      await page.goto(`${getRoleBaseUrl(target, 'user')}/user/properties/${fixture.publicPropertyId}`);
      await assertHealthy(page, '/user/properties/:id', ['Fast Track']);
      await clickIfVisible(page, page.getByLabel(/save/i));
      await assertNoSevereAxeIssues(page, 'user property detail desktop');
      return watchers;
    }));

    for (const viewport of [desktop, mobile]) {
      const suffix = viewport === desktop ? 'desktop' : 'mobile';
      const managerBaseUrl = getRoleBaseUrl(target, 'manager');
      await pass(results, `manager property inventory ${suffix}`, () => withPage(browser, managerSession, viewport, async (page, watchers) => {
        await page.goto(`${managerBaseUrl}/manager/dashboard/properties`);
        await assertHealthy(page, '/manager/dashboard/properties', ['Properties']);
        await page.getByPlaceholder(/search by title/i).fill('QA');
        await clickIfVisible(page, page.getByRole('button', { name: /filters/i }));
        await clickIfVisible(page, page.getByRole('button', { name: /apply filters/i }));
        await clickIfVisible(page, page.getByRole('button', { name: /sort properties/i }));
        await clickIfVisible(page, page.getByRole('button', { name: /price: low to high/i }));
        await clickIfVisible(page, page.getByRole('button', { name: /switch to list view/i }));
        await assertNoSevereAxeIssues(page, `manager property inventory ${suffix}`);
        return watchers;
      }));
    }

    await pass(results, 'manager property detail desktop', () => withPage(browser, managerSession, desktop, async (page, watchers) => {
      await page.goto(`${getRoleBaseUrl(target, 'manager')}/manager/dashboard/properties/${fixture.managerPropertyId}`);
      await assertHealthy(page, '/manager/dashboard/properties/:id', ['Property']);
      await assertNoSevereAxeIssues(page, 'manager property detail desktop');
      return watchers;
    }));

    await pass(results, 'manager property edit desktop', () => withPage(browser, managerSession, desktop, async (page, watchers) => {
      await page.goto(`${getRoleBaseUrl(target, 'manager')}/manager/dashboard/properties/edit/${fixture.managerPropertyId}`);
      await assertHealthy(page, '/manager/dashboard/properties/edit/:id', ['Property']);
      await assertNoSevereAxeIssues(page, 'manager property edit desktop');
      return watchers;
    }));

    for (const viewport of [desktop, mobile]) {
      const suffix = viewport === desktop ? 'desktop' : 'mobile';
      const adminBaseUrl = getRoleBaseUrl(target, 'admin');
      await pass(results, `admin property registry ${suffix}`, () => withPage(browser, adminSession, viewport, async (page, watchers) => {
        await page.goto(`${adminBaseUrl}/admin/properties`);
        await assertHealthy(page, '/admin/properties', ['Registry Control']);
        await page.getByPlaceholder(/search registry/i).fill('QA');
        await page.getByLabel(/sort/i).selectOption('oldest').catch(() => {});
        await assertNoSevereAxeIssues(page, `admin property registry ${suffix}`);
        return watchers;
      }));
    }

    await pass(results, 'admin property detail desktop', () => withPage(browser, adminSession, desktop, async (page, watchers) => {
      await page.goto(`${getRoleBaseUrl(target, 'admin')}/admin/properties/${fixture.adminPropertyId}`);
      await assertHealthy(page, '/admin/properties/:id', ['Property']);
      await assertNoSevereAxeIssues(page, 'admin property detail desktop');
      return watchers;
    }));
  } finally {
    await browser.close();
  }

  const payload = {
    target: target.name,
    generatedAt: new Date().toISOString(),
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
