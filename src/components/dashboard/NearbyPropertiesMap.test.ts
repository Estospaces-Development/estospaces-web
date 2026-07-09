import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "NearbyPropertiesMap.tsx"),
  "utf8",
);

test("nearby properties map uses country-aware location copy and currency", () => {
  assert.match(source, /useUserGeoMarket\(user\)/);
  assert.match(source, /getLaunchLocationCodeLabel\(geoMarket\)/);
  assert.match(source, /formatLaunchLocationCodeSentenceLabel\(locationCodeLabel\)/);
  assert.match(source, /Add a \{sentenceLocationCodeLabel\} to unlock the map/);
  assert.match(source, /Use your profile \{sentenceLocationCodeLabel\}/);
  assert.match(source, /formatLaunchCurrencyForCountry\(property\.price/);
  assert.doesNotMatch(source, /Add a PIN code to unlock the map/);
  assert.doesNotMatch(source, /Use your profile PIN code/);
});
