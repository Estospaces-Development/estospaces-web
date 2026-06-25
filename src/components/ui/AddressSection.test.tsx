import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "src/components/ui/AddressSection.tsx"),
  "utf8",
);

test("address section selects India or UK from the typed PIN or postcode", () => {
  assert.match(source, /getLaunchCountryFromLocationCode\(value\.postalCode\)/);
  assert.match(source, /detectedCountry\.id === value\.countryId/);
  assert.match(source, /countryId: detectedCountry\.id/);
  assert.match(source, /countryName: detectedCountry\.name/);
  assert.match(source, /countryCode: detectedCountry\.code/);
  assert.match(source, /postalCode: normalizeLaunchLocationCode\(value\.postalCode\)/);
});
