import assert from 'node:assert/strict';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { chromium } from 'playwright';

import DocsMarkdown from '../src/components/docs/DocsMarkdown';

const content = `| Status | Meaning | Manager action |
| --- | --- | --- |
| Pending | The reservation is waiting for a decision | Verify the property, dates, and user, then confirm if valid |
| Approved | The manager accepted the reservation | Continue the linked appointment and case workflow |
| Completed | The reservation journey finished | Treat it as history unless follow-up is required |
| Cancelled | The reservation will not continue | Confirm that the user and property state are consistent |`;

test('documentation tables retain readable words and keyboard scrolling on narrow screens', async () => {
  const assets = path.resolve('dist/assets');
  const cssFiles = (await readdir(assets)).filter((file) => file.endsWith('.css'));
  assert.ok(cssFiles.length > 0, 'Build the application before this layout regression');
  const css = (await Promise.all(cssFiles.map((file) => readFile(path.join(assets, file), 'utf8')))).join('\n');
  const markup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(DocsMarkdown, { content })));
  const browser = await chromium.launch();
  const output = path.resolve('output/playwright/docs-mobile-layout');
  await mkdir(output, { recursive: true });
  try {
    for (const width of [283, 325, 390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 642 } });
      await page.setContent(`<style>${css}</style><main class="role-workspace-content" style="padding:24px;max-width:900px">${markup}</main>`);
      const table = page.getByLabel('Scrollable documentation table');
      const metrics = await table.evaluate((element) => {
        const cells = Array.from(element.querySelectorAll('tbody tr td:first-child'));
        return {
          words: cells.map((cell) => {
            const range = document.createRange();
            range.selectNodeContents(cell);
            return { text: cell.textContent, lines: new Set(Array.from(range.getClientRects()).map((rect) => rect.top)).size };
          }),
          viewportWidth: document.documentElement.clientWidth,
          pageWidth: document.documentElement.scrollWidth,
          scrollable: element.scrollWidth > element.clientWidth,
        };
      });
      assert.ok(metrics.pageWidth <= metrics.viewportWidth, `${width}px: table must not overflow the page`);
      assert.ok(metrics.words.every((word) => word.lines === 1), `${width}px: status words must remain intact: ${JSON.stringify(metrics.words)}`);
      if (width < 640) {
        assert.equal(metrics.scrollable, true, `${width}px: wide table must scroll inside its own container`);
        await table.focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => {
          const el = document.querySelector('[aria-label="Scrollable documentation table"]');
          return el && el.scrollLeft > 0;
        });
      }
      await page.screenshot({ path: path.join(output, `${width}x642.png`) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
