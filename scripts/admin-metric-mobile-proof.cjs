const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { resolveTarget, loginViaApi, createAuthedContext } = require('./platform-proof-shared.cjs');

(async () => {
  const target = resolveTarget(['--target=dev']);
  const base = process.env.ADMIN_METRIC_PROOF_URL;
  assert.ok(base, 'Set ADMIN_METRIC_PROOF_URL explicitly');
  assert.ok(['127.0.0.1', new URL(target.appBaseUrl).hostname].includes(new URL(base).hostname), 'Only local/dev proof is supported');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await createAuthedContext(browser, await loginViaApi(target, 'admin'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const output = path.join(process.cwd(), 'output/playwright/admin-metric-mobile');
    fs.mkdirSync(output, { recursive: true });
    for (const width of [283, 360, 1280]) {
      await page.setViewportSize({ width, height: 642 });
      await page.goto(`${base}/admin/dashboard`);
      const grid = page.locator('[data-mobile-compact-summary-grid]');
      await grid.waitFor({ state: 'visible' });
      await page.getByText('Recorded response times only; unanswered leads excluded', { exact: true }).waitFor();
      const rejectOptional = page.getByRole('button', { name: 'Reject optional tools', exact: true });
      if (await rejectOptional.isVisible()) await rejectOptional.click();
      const layout = await grid.evaluate((element) => ({
        columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
        widths: [...element.children].map((child) => child.getBoundingClientRect().width),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      assert.equal(layout.columns, width === 283 ? 1 : width === 360 ? 2 : 4, `${width}px metric reflow`);
      assert.equal(layout.overflow, false, `${width}px horizontal overflow`);
      if (width === 283) assert.ok(layout.widths.every((value) => value >= 200), 'Narrow cards must retain readable content width');
      await page.screenshot({ path: path.join(output, `${width}x642.png`) });
      console.log(`PASS ${width}x642: ${layout.columns} columns, no horizontal overflow`);
    }
    assert.deepEqual(errors, [], 'No unhandled page errors');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
