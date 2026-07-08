import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const globals = readFileSync(resolve(root, "src/globals.css"), "utf8");
const discoverPage = readFileSync(resolve(root, "src/pages/user/dashboard/discover/page.tsx"), "utf8");
const searchPage = readFileSync(resolve(root, "src/pages/user/search/page.tsx"), "utf8");

test("number inputs hide native spinners so min and max price controls stay aligned", () => {
  assert.match(globals, /input\[type="number"\]\s*\{[\s\S]*?appearance:\s*textfield;/);
  assert.match(globals, /input\[type="number"\]::-webkit-outer-spin-button/);
  assert.match(globals, /input\[type="number"\]::-webkit-inner-spin-button/);
  assert.match(globals, /-webkit-appearance:\s*none;/);
});

test("dashboard and search min and max price controls remain number inputs with stable labels", () => {
  for (const source of [discoverPage, searchPage]) {
    assert.match(source, /type="number"/);
  }

  assert.match(discoverPage, /id="discover-min-price"/);
  assert.match(discoverPage, /id="discover-max-price"/);
  assert.match(discoverPage, /aria-label="Min Price"/);
  assert.match(discoverPage, /aria-label="Max Price"/);
  assert.match(searchPage, /id="public-search-min-price"/);
  assert.match(searchPage, /id="public-search-max-price"/);
});
