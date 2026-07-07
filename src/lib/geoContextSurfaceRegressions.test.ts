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
