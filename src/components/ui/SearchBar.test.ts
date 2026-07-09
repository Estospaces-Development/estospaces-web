import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPropertyTypeOptions } from '../../lib/propertyTypeOptions';

const source = readFileSync(resolve(process.cwd(), 'src/components/ui/SearchBar.tsx'), 'utf8');
const publicSearchSource = readFileSync(resolve(process.cwd(), 'src/pages/user/search/page.tsx'), 'utf8');
const userDashboardSource = readFileSync(resolve(process.cwd(), 'src/pages/user/dashboard/DashboardClient.tsx'), 'utf8');
const discoverSource = readFileSync(resolve(process.cwd(), 'src/pages/user/dashboard/discover/page.tsx'), 'utf8');

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

test('dashboard type listbox opens upward instead of relying on native select placement', () => {
    assert.match(source, /aria-haspopup="listbox"/);
    assert.match(source, /role="listbox"/);
    assert.match(source, /bottom-full/);
    assert.doesNotMatch(source, /filterOptions\.property_types\.map\(t => <option/);
});

test('public search property type dropdown uses cleaned upward-opening options', () => {
    assert.match(publicSearchSource, /buildPropertyTypeOptions\(filterOptions\?\.property_types\)/);
    assert.match(publicSearchSource, /id="public-search-property-type-listbox"/);
    assert.match(publicSearchSource, /bottom-full/);
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
    assert.match(source, /const searchMarket = getSupportedLaunchCountry\(undefined, undefined, locationContext\)[\s\S]*\|\| getSupportedLaunchCountry\(undefined, countryNameContext\)[\s\S]*\|\| geoMarket/);
    assert.match(source, /const locationCodeLabel = getLaunchLocationCodeLabel\(searchMarket, undefined, locationContext\)/);
    assert.match(source, /formatLaunchCurrencyForCountry\(amount, \{ countryCode: searchMarket \}\)/);
    assert.match(userDashboardSource, /locationContextCode=\{brokerRequestLocationContext \|\| activeBrokerRequest\?\.location_postcode \|\| undefined\}/);
    assert.match(userDashboardSource, /countryContextName=\{activeJourney\?\.propertyCountry\}/);
    assert.match(userDashboardSource, /fallbackCountryName=\{LAUNCH_COUNTRY_NAME\}/);
    assert.match(userDashboardSource, /<BrokerRequestWidget onLocationContextChange=\{handleBrokerRequestLocationContextChange\} \/>/);
});

test('dashboard search lets a typed or active PIN code override stale country text', () => {
    assert.match(source, /getSupportedLaunchCountry\(undefined, undefined, locationContext\)[\s\S]*getSupportedLaunchCountry\(undefined, countryNameContext\)/);
    assert.doesNotMatch(source, /getSupportedLaunchCountry\(undefined, countryNameContext, locationContext\)/);
    assert.match(source, /placeholder=\{`City or \$\{lowerLocationCodeLabel\}\.\.\.`\}/);
});

test('user dashboard hero search defaults to all sale and rental homes', () => {
    assert.match(userDashboardSource, /listingType: 'all'/);
    assert.match(source, /\{ label: 'All', value: 'all' \}/);
    assert.match(source, /\{ label: 'Buy', value: 'sale' \}/);
    assert.match(source, /\{ label: 'Rent', value: 'rent' \}/);
    assert.match(userDashboardSource, /dashboardSearchFilters\.listingType === 'all'\s*\?\s*undefined/);
    assert.doesNotMatch(userDashboardSource, /listingType: selectedPropertyType === 'rent' \? 'rent' : 'sale'/);
});
