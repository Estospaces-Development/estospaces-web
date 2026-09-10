const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { resolveTarget, loginViaApi, createAuthedContext } = require('./platform-proof-shared.cjs');

(async () => {
  const target = resolveTarget(['--target=dev']);
  const base = process.env.PROPERTY_EDIT_PROOF_URL;
  const title = process.env.PROPERTY_EDIT_PROOF_TITLE;
  assert.ok(base && title, 'Set PROPERTY_EDIT_PROOF_URL and PROPERTY_EDIT_PROOF_TITLE');
  assert.ok(['127.0.0.1', new URL(target.appBaseUrl).hostname].includes(new URL(base).hostname), 'Only local/dev proof is supported');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await createAuthedContext(browser, await loginViaApi(target, 'manager'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 283, height: 642 });
    await page.goto(`${base}/manager/dashboard/properties`);
    await page.getByRole('textbox', { name: 'Search manager properties', exact: true }).fill(title);
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    const reject = page.getByRole('button', { name: 'Reject optional tools', exact: true });
    if (await reject.isVisible()) await reject.click();
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const output = path.join(process.cwd(), 'output/playwright/property-edit-location');
    fs.mkdirSync(output, { recursive: true });
    for (const entry of ['from-list', 'after-reload']) {
      if (entry === 'after-reload') await page.reload();
      await page.getByRole('button', { name: 'Next: Location', exact: true }).click();
      const state = page.getByRole('combobox', { name: 'State / Union Territory *', exact: true });
      await state.waitFor();
      const city = page.getByRole('combobox', { name: 'City *', exact: true });
      await page.waitForFunction(() => {
        const select = document.querySelector('#manager-property-city');
        return select && !select.disabled && select.value;
      }, null, { timeout: 10000 });
      assert.equal(await city.isEnabled(), true, 'Saved city remains selectable');
      await page.getByText('Property location is pinned and will be saved with the listing.', { exact: true }).waitFor();
      assert.equal(await page.locator('.property-location-marker').count(), 1, 'Persisted pin is visible');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
      await city.evaluate(element => element.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: path.join(output, `${entry}-address-283x642.png`) });
      await page.getByRole('region', { name: 'Interactive property location map', exact: true }).evaluate(element => element.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: path.join(output, `${entry}-283x642.png`) });
      console.log(`PASS ${entry}: country, city and persisted pin restored at 283x642`);
    }
    assert.deepEqual(errors, [], 'No unhandled page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
