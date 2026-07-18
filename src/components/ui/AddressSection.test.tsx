import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "src/components/ui/AddressSection.tsx"),
  "utf8",
);

test("address section does not switch country based on the typed PIN or postcode", () => {
  // Typing a PIN/postcode must never silently change the selected country — it should only
  // be validated against whichever country is already selected (see
  // managerPropertyFormValidation.ts's postalCode case), surfacing an "invalid pincode/postcode
  // for <country>" error on mismatch instead.
  assert.doesNotMatch(source, /getLaunchCountryFromLocationCode/);
  assert.doesNotMatch(source, /detectedCountry/);
  assert.match(source, /handleTextChange\('postalCode', postalCode\)/);
});

test("address section uses country-aware state and region copy", () => {
  assert.match(source, /stateLabel:\s*'State \/ Union Territory'/);
  assert.match(source, /statePlaceholder:\s*'Select state \/ union territory'/);
  assert.match(source, /cityFirstPlaceholder:\s*'Select state first'/);
  assert.match(source, /stateLabel:\s*'Region'/);
  assert.match(source, /statePlaceholder:\s*'Select region'/);
  assert.match(source, /cityFirstPlaceholder:\s*'Select region first'/);
  assert.match(source, /administrativeAreaCopy\.stateLabel/);
  assert.match(source, /administrativeAreaCopy\.cityFirstPlaceholder/);
});
