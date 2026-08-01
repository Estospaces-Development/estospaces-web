import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "NearbyPropertiesMap.tsx"),
  "utf8",
);

test("nearby properties map uses country-aware location copy and rupee-only map prices", () => {
  assert.match(source, /useUserGeoMarket\(user\)/);
  assert.match(source, /getLaunchLocationCodeLabel\(geoMarket\)/);
  assert.match(source, /Add a \{lowerLocationCodeLabel\} to unlock the map/);
  assert.match(source, /Use your profile \{lowerLocationCodeLabel\}/);
  assert.match(source, /formatMapPriceInRupees\(property\?\.price\)/);
  assert.match(source, /formatMapPriceInRupees\(property\.price, 'View'\)/);
  assert.doesNotMatch(source, /currencyCode:\s*property\.currency/);
  assert.doesNotMatch(source, /formatLaunchCurrencyForCountry/);
  assert.doesNotMatch(source, /Add a PIN code to unlock the map/);
  assert.doesNotMatch(source, /Use your profile PIN code/);
});
