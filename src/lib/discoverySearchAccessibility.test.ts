import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const searchPage = readFileSync(resolve(root, "src/pages/user/search/page.tsx"), "utf8");
const propertySearchControls = readFileSync(resolve(root, "src/lib/propertySearchControls.ts"), "utf8");
const publicHeader = readFileSync(resolve(root, "src/components/layout/PublicHeader.tsx"), "utf8");
const propertyDetailPage = readFileSync(resolve(root, "src/pages/user/properties/[id]/page.tsx"), "utf8");
const welcomeModal = readFileSync(resolve(root, "src/components/dashboard/WelcomeModal.tsx"), "utf8");
const seoMetadata = readFileSync(resolve(root, "src/lib/seo.ts"), "utf8");

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

test("user search main input uses country-aware PIN or postcode copy", () => {
  assert.match(searchPage, /placeholder=\{`Search by \$\{lowerLocationCodeLabel\}, city, property name\.\.\.`\}/);
  assert.doesNotMatch(searchPage, /Search by location, property name/);
});

test("user search visibly summarizes active URL filters and broader fallback state", () => {
  assert.match(searchPage, /const activeFilterChips = useMemo/);
  assert.match(searchPage, /aria-label="Active search filters"/);
  assert.match(searchPage, /Active filters/);
  assert.doesNotMatch(searchPage, /chips\.push\(\{ label: 'Market'/);
  assert.doesNotMatch(searchPage, /value: market === 'GB' \? 'England'/);
  assert.match(searchPage, /const buildBroaderSearchAttempts = useCallback/);
  assert.match(propertySearchControls, /No exact matches for the selected budget/);
  assert.doesNotMatch(searchPage, /No exact matches for this location/);
  assert.doesNotMatch(propertySearchControls, /No exact matches for this location/);
});

test("correcting or clearing an inferred market also resets stale pagination", () => {
  assert.match(searchPage, /const nextMarket = inferSearchMarketFromText\(exactLocation\.text\) \|\| '';[\s\S]*if \(market !== nextMarket\) \{[\s\S]*setMarket\(nextMarket\);[\s\S]*setPage\(1\);/);
});

test("autocomplete checks all results for title ambiguity before limiting visible suggestions", () => {
  assert.match(searchPage, /const visibleSuggestions = suggestions\.slice\(0, 10\);[\s\S]*setLocationSuggestions\(visibleSuggestions\);[\s\S]*getExactLocationSuggestion\(query, suggestions\);/);
  assert.doesNotMatch(searchPage, /getExactLocationSuggestion\(query, visibleSuggestions\)/);
});

test("explicit location controls replace or clear stale market state", () => {
  assert.match(searchPage, /isLocationAutocompleteSuggestion\(suggestion\)[\s\S]*setLocation\(suggestion\.text\);[\s\S]*setMarket\(inferSearchMarketFromText\(suggestion\.text\) \|\| ''\);/);
  assert.match(searchPage, /const nextLocation = e\.target\.value;[\s\S]*setLocation\(nextLocation\);[\s\S]*setMarket\(inferSearchMarketFromText\(nextLocation\) \|\| ''\);/);
});

test("keyword transitions clear an auto-inferred location and its market together", () => {
  const inferredLocationClearPattern = /if \(location === previousInference\) \{\s*setLocation\(''\);\s*setMarket\(''\);\s*\}/g;
  const typedLocationClearPattern = /if \(previousInference && location === previousInference\) \{\s*setLocation\(''\);\s*setMarket\(''\);\s*\}/;
  assert.ok((searchPage.match(inferredLocationClearPattern)?.length || 0) >= 1);
  assert.match(searchPage, typedLocationClearPattern);
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
test("user search keeps settled results stable while refreshed requests are in flight", () => {
  assert.match(searchPage, /const \[hasLoadedSearch, setHasLoadedSearch\] = useState\(false\);/);
  assert.match(searchPage, /const latestSearchRequestRef = useRef\(0\);/);
  assert.match(searchPage, /if \(requestId !== latestSearchRequestRef\.current\) \{/);
  assert.match(searchPage, /const isInitialSearchLoading = loading && !hasLoadedSearch;/);
  assert.match(searchPage, /\{isInitialSearchLoading \? '\.\.\.' : total\}/);
  assert.match(searchPage, /\{isInitialSearchLoading \? \(/);
  assert.match(searchPage, /Refreshing search results\./);
  assert.doesNotMatch(searchPage, /\{loading \? '\.\.\.' : total\}/);
  assert.doesNotMatch(searchPage, /\{loading \? \(/);
});

test("property detail action and gallery controls expose stable button state", () => {
  assert.match(propertyDetailPage, /aria-pressed=\{index === selectedImageIndex\}/);
  assert.match(propertyDetailPage, /type="button"[\s\S]*?onClick=\{handleBackNavigation\}/);
  assert.match(propertyDetailPage, /type="button"[\s\S]*?Request 24-Hour Fast Track/);
  assert.doesNotMatch(propertyDetailPage, /createFastTrackCase/);
  assert.match(propertyDetailPage, /type="button"[\s\S]*?Open live workspace/);
  assert.doesNotMatch(propertyDetailPage, /type="button"[\s\S]*?Open Message Thread/);
});

test("property detail describes listing type without internal market terminology", () => {
  assert.match(propertyDetailPage, /\{ label: 'Listing type', value: listingLabel \}/);
  assert.doesNotMatch(propertyDetailPage, /\{ label: 'Market', value: listingLabel \}/);
});

test("property discovery copy uses user-facing location terminology", () => {
  assert.match(welcomeModal, /properties across supported locations/);
  assert.match(seoMetadata, /listings across supported locations/);
  assert.doesNotMatch(welcomeModal, /supported markets/);
  assert.doesNotMatch(seoMetadata, /supported markets/);
});
