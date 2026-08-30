import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPropertyTypeOptions } from '../../lib/propertyTypeOptions';
import { shouldClearSearchBarAfterNavigation, shouldHydrateSearchBarFromUrl } from './SearchBar';

const source = readFileSync(resolve(process.cwd(), 'src/components/ui/SearchBar.tsx'), 'utf8');
const publicSearchSource = readFileSync(resolve(process.cwd(), 'src/pages/user/search/page.tsx'), 'utf8');
const userDashboardSource = readFileSync(resolve(process.cwd(), 'src/pages/user/dashboard/DashboardClient.tsx'), 'utf8');
const discoverSource = readFileSync(resolve(process.cwd(), 'src/pages/user/dashboard/discover/page.tsx'), 'utf8');

test('compact and page search variants keep independent draft state', () => {
    const routeFilters = { keyword: 'chennai' };

    assert.equal(shouldHydrateSearchBarFromUrl('compact'), false);
    assert.equal(shouldHydrateSearchBarFromUrl('full'), true);
    assert.equal(shouldHydrateSearchBarFromUrl('hero', routeFilters), false);
    assert.equal(shouldClearSearchBarAfterNavigation('compact'), true);
    assert.equal(shouldClearSearchBarAfterNavigation('full'), false);
    assert.match(source, /autoComplete="off"/);
    assert.match(source, /shouldClearSearchBarAfterNavigation\(variant\)[\s\S]*setFilters\(defaultFilters\)/);
});

test('dashboard type options merge API filters with the shared property defaults', () => {
    const options = buildPropertyTypeOptions(['rent', 'apartment', 'sale', 'villa', 'Apartment']);
    const values = options.map((option) => option.value);

    assert.equal(options[0].label, 'All Types');
    assert.ok(values.includes('apartment'));
    assert.ok(values.includes('house'));
    assert.ok(values.includes('villa'));
    assert.equal(values.filter((value) => value === 'apartment').length, 1);
    assert.ok(!values.includes('rent'));
    assert.ok(!values.includes('sale'));
});

test('dashboard type listbox opens downward within the viewport', () => {
    assert.match(source, /aria-haspopup="listbox"/);
    assert.match(source, /role="listbox"/);
    assert.match(source, /bottom-full/);
    assert.doesNotMatch(source, /filterOptions\.property_types\.map\(t => <option/);
});

test('public search property type dropdown uses cleaned downward-opening options', () => {
    assert.match(publicSearchSource, /buildPropertyTypeOptions\(filterOptions\?\.property_types\)/);
    assert.match(publicSearchSource, /id="public-search-property-type-listbox"/);
    assert.match(publicSearchSource, /top-full/);
    assert.doesNotMatch(publicSearchSource, /filterOptions\?\.property_types \|\| \[\]\)\.map/);
});

test('discover property type dropdown uses the shared global filter options', () => {
    assert.match(discoverSource, /import \{ buildPropertyTypeOptions \} from '@\/lib\/propertyTypeOptions';/);
    assert.match(discoverSource, /const \[globalFilterOptions, setGlobalFilterOptions\] = useState<FilterOptions \| null>\(null\);/);
    assert.match(discoverSource, /const options = await searchService\.getFilters\(\);/);
    assert.match(discoverSource, /globalFilterOptions\?\.property_types\?\.length[\s\S]*\? globalFilterOptions\.property_types[\s\S]*: filterOptions\?\.property_types/);
    assert.match(discoverSource, /buildPropertyTypeOptions\(propertyTypes\)\.map/);
    assert.match(discoverSource, /discoverPropertyTypeOptions\.map\(\(option\) =>/);
    assert.doesNotMatch(discoverSource, /\(filterOptions\?\.property_types \|\| \[\]\)\.map/);
});

test('location suggestions keep long dashboard results contained', () => {
    assert.match(source, /setLocationSuggestions\(selectLocationSuggestions\(suggestions\)\)/);
    assert.doesNotMatch(source, /suggestion\.type === 'property'/);
    assert.match(source, /const suggestionMenuClassName = .*min-w-\[min\(22rem,calc\(100vw-2rem\)\)\]/);
    assert.match(source, /const suggestionOptionClassName = .*min-w-0/);
    assert.match(source, /const suggestionLabelClassName = .*min-w-0 flex-1/);
    assert.match(source, /const suggestionTextClassName = "truncate"/);
    assert.match(source, /const suggestionTypeClassName = "shrink-0/);
});

test('user dashboard search uses the shared hero search type control', () => {
    assert.match(userDashboardSource, /<SearchBar[\s\S]*variant="hero"/);
    assert.match(userDashboardSource, /onSearch=\{handleDashboardSearch\}/);
});

test('user dashboard search passes active request location context into shared search copy', () => {
    assert.match(source, /locationContextCode\?: string \| null;/);
    assert.match(source, /countryContextName\?: string \| null;/);
    assert.match(source, /fallbackCountryName\?: string \| null;/);
    assert.match(source, /const locationContext = filters\.location \|\| locationContextCode \|\| user\?\.postcode/);
    assert.match(source, /const countryNameContext = countryContextName \|\| \(!locationContext && !userCountrySignal \? fallbackCountryName : undefined\)/);
    assert.match(source, /const searchMarket = inferSearchMarketFromText\(filters\.location\)[\s\S]*\|\| getSupportedLaunchCountry\(undefined, undefined, locationContext\)[\s\S]*\|\| getSupportedLaunchCountry\(undefined, countryNameContext\)[\s\S]*\|\| geoMarket/);
    assert.match(source, /const locationCodeLabel = getLaunchLocationCodeLabel\(searchMarket, undefined, locationContext\)/);
    assert.match(source, /const sentenceLocationCodeLabel = locationCodeLabel === 'PIN code' \? locationCodeLabel : lowerLocationCodeLabel/);
    assert.match(source, /formatLaunchCurrencyForCountry\(amount, \{ countryCode: searchMarket \}\)/);
    assert.match(userDashboardSource, /locationContextCode=\{brokerRequestLocationContext \|\| activeBrokerRequest\?\.location_postcode \|\| undefined\}/);
    assert.match(userDashboardSource, /countryContextName=\{activeJourney\?\.propertyCountry\}/);
    assert.match(userDashboardSource, /fallbackCountryName=\{LAUNCH_COUNTRY_NAME\}/);
    assert.match(userDashboardSource, /<BrokerRequestWidget[\s\S]*onLocationContextChange=\{handleBrokerRequestLocationContextChange\}[\s\S]*preferredRequestId=\{activeJourney\?\.brokerRequestId \|\| \([\s\S]*activeBrokerRequest && shouldAutoResumeBrokerRequest\(activeBrokerRequest\)[\s\S]*\? activeBrokerRequest\.id[\s\S]*: null[\s\S]*\)\}[\s\S]*\/>/);
});

test('free-text property titles do not select a country market', () => {
    assert.match(source, /const submittedMarket = nextFilters\.location[\s\S]*\? inferSearchMarketFromText\(nextFilters\.location\)[\s\S]*: null;/);
    assert.doesNotMatch(source, /inferSearchMarketFromText\(nextFilters\.location \|\| trimmedKeyword\)/);
    assert.doesNotMatch(source, /inferSearchMarketFromText\(nextFilters\.location\) \|\| searchMarket/);
});

test('dashboard search lets a typed or active PIN code override stale country text', () => {
    assert.match(source, /getSupportedLaunchCountry\(undefined, undefined, locationContext\)[\s\S]*getSupportedLaunchCountry\(undefined, countryNameContext\)/);
    assert.doesNotMatch(source, /getSupportedLaunchCountry\(undefined, countryNameContext, locationContext\)/);
    assert.match(source, /placeholder=\{`City or \$\{sentenceLocationCodeLabel\}\.\.\.`\}/);
});

test('user dashboard hero search defaults to all sale and rental homes', () => {
    assert.match(userDashboardSource, /listingType: 'all'/);
    assert.match(source, /\{ label: 'All', value: 'all' \}/);
    assert.match(source, /\{ label: 'Buy', value: 'sale' \}/);
    assert.match(source, /\{ label: 'Rent', value: 'rent' \}/);
    assert.match(userDashboardSource, /dashboardSearchFilters\.listingType === 'all'\s*\?\s*undefined/);
    assert.doesNotMatch(userDashboardSource, /listingType: selectedPropertyType === 'rent' \? 'rent' : 'sale'/);
});

test('dashboard search rejects invalid keyword characters before searching or navigating', () => {
    assert.match(source, /getSearchQueryValidationMessage/);
    assert.match(source, /const keywordValidationMessage = getSearchQueryValidationMessage\(rawKeyword\);/);
    assert.match(source, /if \(keywordValidationMessage\) \{[\s\S]*toast\.error\(keywordValidationMessage\);[\s\S]*return;/);
    assert.match(source, /const submittedFilters = \{ \.\.\.nextFilters, keyword: trimmedKeyword \};/);
    assert.match(source, /onSearch\) onSearch\(submittedFilters\);/);
});

test('user dashboard search hands submitted filters to the canonical Discover page', () => {
    assert.match(userDashboardSource, /const dashboardSearchParamKeys = \[[\s\S]*'q',[\s\S]*'location',[\s\S]*'propertyType',[\s\S]*'minPrice',[\s\S]*'maxPrice',[\s\S]*'beds',[\s\S]*'baths'/);
    assert.match(userDashboardSource, /const nextDashboardType = nextFilters\.listingType === 'rent'[\s\S]*selectedPropertyType;/);
    assert.match(userDashboardSource, /const params = buildDiscoverParams\(nextDashboardType, selectedFilters, nextFilters\);/);
    assert.match(userDashboardSource, /navigate\(`\/user\/dashboard\/discover\$\{queryString \? `\?\$\{queryString\}` : ''\}`\);/);
});

test('user dashboard clear search removes stale dashboard URL filters', () => {
    assert.match(userDashboardSource, /const clearFilteredResults = useCallback\(\(\) => \{[\s\S]*setShowFilteredResults\(false\);[\s\S]*setSearchParams\(\(previous\) => \{/);
    assert.match(userDashboardSource, /const next = new URLSearchParams\(previous\);[\s\S]*dashboardSearchParamKeys\.forEach\(\(key\) => next\.delete\(key\)\);[\s\S]*return next;/);
    assert.match(userDashboardSource, /\}, \{ replace: true \}\);[\s\S]*\}, \[setSearchParams\]\);/);
});

test('user dashboard property navigation preserves the active browser search cache', () => {
    assert.match(userDashboardSource, /savePropertySearchReturnState\(window\.sessionStorage, \{[\s\S]*pathname: USER_DASHBOARD_PATH,[\s\S]*search: dashboardReturnSearch,[\s\S]*scrollY: window\.scrollY/);
    assert.match(userDashboardSource, /const dashboardReturnPath = `\$\{USER_DASHBOARD_PATH\}\$\{dashboardReturnSearch \? `\?\$\{dashboardReturnSearch\}` : ''\}`;/);
    assert.match(userDashboardSource, /const openPropertyFromDashboard[\s\S]*cacheDashboardSearchReturn\(\);[\s\S]*backTo: dashboardReturnPath/);
    assert.match(userDashboardSource, /const openFastTrackFromDashboard[\s\S]*cacheDashboardSearchReturn\(\);[\s\S]*backTo: dashboardReturnPath/);
    assert.match(userDashboardSource, /if \(!cachedSearch \|\| searchLoading \|\| !filteredSearchCompleted \|\| !showFilteredResults\)/);
    assert.doesNotMatch(userDashboardSource, /backTo: '\/user\/dashboard'/);
});

test('user dashboard search URL preserves quick filters and pagination', () => {
    assert.match(userDashboardSource, /buildDashboardReturnSearchParams[\s\S]*new URLSearchParams\(currentSearchParams\)[\s\S]*if \(currentPage > 1\)[\s\S]*params\.set\('page', String\(currentPage\)\)/);
    assert.match(userDashboardSource, /dashboardReturnSearchParams\.forEach\(\(value, key\) => next\.set\(key, value\)\)/);
});

test('user dashboard keeps unrelated return context and rejects a mismatched stale cache', () => {
    assert.match(userDashboardSource, /const params = new URLSearchParams\(currentSearchParams\);/);
    assert.match(userDashboardSource, /hasExplicitDashboardSearch[\s\S]*!searchParamsMatch\(searchParams, new URLSearchParams\(cachedSearch\)\)[\s\S]*clearPropertySearchReturnState\(window\.sessionStorage, USER_DASHBOARD_PATH\);[\s\S]*cachedDashboardSearchRef\.current = null;/);
});
