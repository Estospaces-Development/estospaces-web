import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const readSource = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

test("application modal uses property/user country context for search copy and money", () => {
  const source = readSource("components/dashboard/applications/NewApplicationModal.tsx");

  assert.match(source, /useUserGeoMarket\(user/);
  assert.match(source, /getLaunchLocationCodeLabel\(userGeoMarket/);
  assert.match(source, /placeholder=\{`Search by name, city, or \$\{lowerLocationCodeLabel\}\.\.\.`\}/);
  assert.match(source, /formatLaunchCurrencyForCountry\(property\?\.price/);
  assert.match(source, /Annual Income \(\{incomeCurrencyCode\}\)/);
  assert.match(source, /IncomeCurrencyIcon/);
  assert.doesNotMatch(source, /Search by name, city, PIN code, or postcode/);
  assert.doesNotMatch(source, /LAUNCH_CURRENCY_SYMBOL/);
});

test("user property list formats each property with its own country currency", () => {
  const source = readSource("components/dashboard/UserPropertiesList.tsx");

  assert.match(source, /formatLaunchCurrencyForCountry\(property\.price/);
  assert.match(source, /currencyCode: property\.currency/);
  assert.doesNotMatch(source, /formatLaunchCurrency\(property\.price/);
});

test("manager property filters do not show hardcoded dollar price ranges", () => {
  const source = readSource("pages/manager/dashboard/properties/page.tsx");

  assert.match(source, /buildPriceRanges/);
  assert.match(source, /formatLaunchCurrencyForCountry\(amount/);
  assert.match(source, /useUserGeoMarket\(user\)/);
  assert.doesNotMatch(source, /Under \$100K/);
  assert.doesNotMatch(source, /\$100K - \$250K/);
});

test("shared search ranges and property cards format money by country context", () => {
  const searchBarSource = readSource("components/ui/SearchBar.tsx");
  const propertyCardSource = readSource("components/dashboard/PropertyCard.tsx");
  const managerPropertyCardSource = readSource("components/dashboard/ManagerPropertyCard.tsx");

  assert.match(searchBarSource, /buildSearchPriceRanges/);
  assert.match(searchBarSource, /getSupportedLaunchCountry\(undefined, undefined, locationContext\)[\s\S]*\|\| getSupportedLaunchCountry\(undefined, countryNameContext\)[\s\S]*\|\| geoMarket/);
  assert.match(searchBarSource, /getLaunchLocationCodeLabel\(searchMarket, undefined, locationContext\)/);
  assert.match(searchBarSource, /formatLaunchCurrencyForCountry\(amount, \{ countryCode: searchMarket \}\)/);
  assert.doesNotMatch(searchBarSource, /new Intl\.NumberFormat\('en-GB'/);
  assert.doesNotMatch(searchBarSource, /formatLaunchCurrency\(/);

  assert.match(propertyCardSource, /formatLaunchCurrencyForCountry\(amount/);
  assert.match(propertyCardSource, /property\.countryCode/);
  assert.match(propertyCardSource, /currencyCode: currencyCode \|\| property\.currency/);
  assert.match(propertyCardSource, /getSavedPropertyLocationLabel\(property\)/);
  assert.doesNotMatch(propertyCardSource, /typeof property\.location === 'string'/);
  assert.doesNotMatch(propertyCardSource, /formatLaunchCurrency\(/);

  assert.match(managerPropertyCardSource, /formatLaunchCurrencyForCountry\(amount/);
  assert.match(managerPropertyCardSource, /property\.countryCode/);
  assert.match(managerPropertyCardSource, /currencyCode: currencyCode \|\| property\.currency/);
  assert.doesNotMatch(managerPropertyCardSource, /formatLaunchCurrency\(/);
});

test("application displays preserve property country for currency formatting", () => {
  const contextSource = readSource("contexts/ApplicationsContext.tsx");
  const workflowSource = readSource("lib/applicationWorkflow.ts");
  const userCardSource = readSource("components/dashboard/applications/ApplicationCard.tsx");
  const managerCardSource = readSource("components/manager/applications/ApplicationCard.tsx");
  const managerDetailSource = readSource("components/manager/applications/ApplicationDetail.tsx");
  const userApplicationsSource = readSource("pages/user/applications/page.tsx");

  assert.match(contextSource, /propertyCountry\?: string/);
  assert.match(contextSource, /propertyCountry: application\.property_country/);
  assert.match(contextSource, /property_country: data\.property_country \|\| propertySnapshot\.property_country/);
  assert.match(workflowSource, /property_country: propertyCountry/);

  for (const source of [userCardSource, managerCardSource, managerDetailSource, userApplicationsSource]) {
    assert.match(source, /formatLaunchCurrencyForCountry/);
    assert.match(source, /countryCode: application\??\.propertyCountry/);
    assert.match(source, /currencyCode: application\??\.propertyCurrency/);
    assert.doesNotMatch(source, /formatLaunchCurrency\(/);
  }
});

test("active user manager and admin flows avoid default launch money on property context", () => {
  const discoverSource = readSource("pages/user/dashboard/discover/page.tsx");
  const brokerRequestSource = readSource("components/dashboard/BrokerRequestWidget.tsx");
  const brokerResponseSource = readSource("components/dashboard/BrokerResponseWidget.tsx");
  const timelineSource = readSource("components/dashboard/ApplicationTimelineWidget.tsx");
  const fastTrackSource = readSource("components/fast-track/FastTrackWorkspace.tsx");
  const managerAddSource = readSource("pages/manager/dashboard/properties/add/page.tsx");
  const managerDetailSource = readSource("pages/manager/dashboard/properties/[id]/page.tsx");
  const savedSource = readSource("pages/user/saved/page.tsx");
  const managerContractsSource = readSource("pages/manager/contracts/page.tsx");
  const adminPropertiesSource = readSource("pages/admin/properties/page.tsx");

  assert.match(discoverSource, /searchService\.getPropertySections\(geoMarket\)/);
  assert.match(discoverSource, /getLaunchLocationCodeLabel\(geoMarket/);
  assert.match(discoverSource, /formatDiscoveryCurrency/);
  assert.doesNotMatch(discoverSource, /getPropertySections\(LAUNCH_COUNTRY_CODE\)/);
  const publicSearchSource = readSource("pages/user/search/page.tsx");
  assert.match(publicSearchSource, /inferSearchGeoMarket/);
  assert.match(publicSearchSource, /inferredGeoMarket \|\| fallbackGeoMarket/);
  assert.match(publicSearchSource, /currency === 'GBP'/);
  assert.match(publicSearchSource, /Min Price \(\{currencySymbol\}\)/);
  assert.match(publicSearchSource, /Max Price \(\{currencySymbol\}\)/);

  for (const source of [brokerRequestSource, brokerResponseSource, timelineSource, savedSource, managerContractsSource, adminPropertiesSource]) {
    assert.match(source, /formatLaunchCurrencyForCountry/);
  }

  assert.match(fastTrackSource, /formatLaunchCurrencyForCountry\(selectedCase\.agreement\.amountDue/);
  assert.match(managerAddSource, /resolveCountryCurrency\(property\.location\?\.countryCode \|\| ""\)/);
  assert.match(managerDetailSource, /formatLaunchCurrencyForCountry\(amount/);
  assert.doesNotMatch(brokerRequestSource, /formatLaunchCurrency\(price\)/);
  assert.doesNotMatch(brokerResponseSource, /formatLaunchCurrency\(price\)/);
});
