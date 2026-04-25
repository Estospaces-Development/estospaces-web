const fs = require('node:fs');
const { chromium, firefox } = require('playwright');
const {
  buildArtifactPath,
  ensureReachable,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

const scenarios = [
  { id: 'PUB-001', route: '/', expected: /Search|Search properties|Dashboard|Estospaces/i },
  { id: 'PUB-002', route: '/login', expected: /Sign In|Login/i },
  { id: 'PUB-003', route: '/register', expected: /Register|Create account|Sign Up/i },
  { id: 'PUB-004', route: '/forgot-password', expected: /Forgot password|Reset/i },
  { id: 'PUB-005', route: '/contact', expected: /Contact|Get in touch/i },
  { id: 'PUB-006', route: '/faq', expected: /FAQ|Frequently Asked/i },
  { id: 'PUB-007', route: '/privacy', expected: /Privacy/i },
  { id: 'PUB-008', route: '/terms', expected: /Terms/i },
];

async function runViewportPass(browserType, target, viewport, label) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();
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

  const results = [];
  try {
    for (const scenario of scenarios) {
      await page.goto(`${target.baseUrl}${scenario.route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      const text = await page.locator('body').innerText();
      results.push({
        id: `${scenario.id}-${label}`,
        route: scenario.route,
        label,
        ok: scenario.expected.test(text),
        actualUrl: new URL(page.url()).pathname,
      });
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return { results, pageErrors, consoleErrors, networkErrors };
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  await ensureReachable(target.baseUrl);
  const artifactPath = buildArtifactPath(`public-${target.name}-proof.json`);

  const desktop = await runViewportPass(chromium, target, { width: 1440, height: 960 }, 'chromium-desktop');
  const mobile = await runViewportPass(chromium, target, { width: 390, height: 844 }, 'chromium-mobile');
  const firefoxDesktop = await runViewportPass(firefox, target, { width: 1440, height: 960 }, 'firefox-desktop');

  const result = {
    target: target.name,
    baseUrl: target.baseUrl,
    steps: [...desktop.results, ...mobile.results, ...firefoxDesktop.results],
    pageErrors: {
      chromiumDesktop: desktop.pageErrors,
      chromiumMobile: mobile.pageErrors,
      firefoxDesktop: firefoxDesktop.pageErrors,
    },
    consoleErrors: {
      chromiumDesktop: desktop.consoleErrors,
      chromiumMobile: mobile.consoleErrors,
      firefoxDesktop: firefoxDesktop.consoleErrors,
    },
    networkErrors: {
      chromiumDesktop: desktop.networkErrors,
      chromiumMobile: mobile.networkErrors,
      firefoxDesktop: firefoxDesktop.networkErrors,
    },
  };

  result.overallOk = result.steps.every((step) => step.ok)
    && Object.values(result.pageErrors).every((items) => items.length === 0)
    && Object.values(result.consoleErrors).every((items) => items.length === 0)
    && Object.values(result.networkErrors).every((items) => items.length === 0);

  fs.writeFileSync(artifactPath, JSON.stringify(result, null, 2));

  if (!result.overallOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
