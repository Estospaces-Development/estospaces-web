import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const searchPage = readFileSync(resolve(root, "src/pages/user/search/page.tsx"), "utf8");
const publicHeader = readFileSync(resolve(root, "src/components/layout/PublicHeader.tsx"), "utf8");
const propertyDetailPage = readFileSync(resolve(root, "src/pages/user/properties/[id]/page.tsx"), "utf8");

test("user search exposes filter and result view state to assistive tech", () => {
  assert.match(searchPage, /aria-expanded=\{showFilters\}/);
  assert.match(searchPage, /aria-controls="public-search-filters"/);
  assert.match(searchPage, /id="public-search-filters"/);
  assert.match(searchPage, /aria-pressed=\{viewMode === 'grid'\}/);
  assert.match(searchPage, /aria-pressed=\{viewMode === 'list'\}/);
});

test("user search autocomplete is tied to the search field", () => {
  assert.match(searchPage, /aria-controls=\{showSuggestions && locationSuggestions\.length > 0 \? 'public-search-suggestions' : undefined\}/);
  assert.match(searchPage, /aria-expanded=\{showSuggestions && locationSuggestions\.length > 0\}/);
  assert.match(searchPage, /id="public-search-suggestions"/);
  assert.match(searchPage, /key=\{index\}[\s\S]*?type="button"/);
});

test("user search keeps result headings in order below the page title", () => {
  assert.match(searchPage, /<h2 className="text-base font-semibold text-gray-950 dark:text-white">Search temporarily unavailable<\/h2>/);
  assert.match(searchPage, /<h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No properties found<\/h2>/);
  assert.match(searchPage, /<h2 className="mobile-safe-text font-semibold text-gray-900 dark:text-white mb-1 cursor-pointer"/);
});

test("public Search navbar preserves active filtered search URLs", () => {
  assert.match(publicHeader, /const location = useLocation\(\);/);
  assert.match(publicHeader, /const resolveNavHref = \(link: NavLink\) => \{/);
  assert.match(publicHeader, /link\.href === '\/search' && pathname === '\/search' && location\.search/);
  assert.ok(publicHeader.includes("return `${link.href}${location.search}`;"));
  assert.match(publicHeader, /const handleNavLinkClick = \(event: React\.MouseEvent<HTMLAnchorElement>, link: NavLink\) => \{/);
  assert.match(publicHeader, /event\.preventDefault\(\);/);
  assert.match(publicHeader, /onClick=\{\(event\) => handleNavLinkClick\(event, link\)\}/);
  assert.match(publicHeader, /to=\{resolveNavHref\(link\)\}/);
  assert.doesNotMatch(publicHeader, /to=\{link\.href\}/);
});

test("property detail action and gallery controls expose stable button state", () => {
  assert.match(propertyDetailPage, /aria-pressed=\{index === selectedImageIndex\}/);
  assert.match(propertyDetailPage, /type="button"[\s\S]*?onClick=\{handleBackNavigation\}/);
  assert.match(propertyDetailPage, /type="button"[\s\S]*?Start 24-Hour Fast Track/);
  assert.match(propertyDetailPage, /type="button"[\s\S]*?Open live workspace/);
  assert.match(propertyDetailPage, /type="button"[\s\S]*?Open Message Thread/);
});
