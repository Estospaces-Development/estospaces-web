import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceFrom = (file: string) => readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), file),
  "utf8",
);

const verificationSectionSource = () => sourceFrom("VerificationSection.tsx");

test("profile verification uses country-aware identity and address guidance", () => {
  const source = verificationSectionSource();
  const guidanceSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../lib/countryDocumentGuidance.ts"),
    "utf8",
  );

  assert.ok(source.includes("locationCodeOverride?: string | null"));
  assert.ok(source.includes("useUserGeoMarket(currentUser, { locationCode: locationCodeOverride || currentUser?.postcode })"));
  assert.ok(source.includes("getCountryDocumentGuidance(geoMarket)"));
  assert.ok(source.includes("Accepted identity documents: {verificationDocumentGuidance.identityShort}"));
  assert.ok(source.includes("description={verificationDocumentGuidance.identityDetail}"));
  assert.ok(source.includes("description={verificationDocumentGuidance.addressDetail}"));
  assert.ok(source.includes("verificationDocumentGuidance.firstTimeSummary"));
  assert.ok(guidanceSource.includes("Aadhaar proof, PAN card or Form 60, passport, voter ID, driving licence, NREGA job card, or NPR letter"));
  assert.ok(guidanceSource.includes("Prefer masked Aadhaar"));
  assert.ok(guidanceSource.includes("recent utility bill, bank statement, rent agreement"));
  assert.ok(guidanceSource.includes("British or Irish passport, driving licence, BRP/BRC, or right-to-rent share code"));
  assert.ok(guidanceSource.includes("right-to-rent evidence may be required separately"));
});

test("profile verification can follow the currently edited location code", () => {
  const source = verificationSectionSource();
  const profileSource = sourceFrom("../../pages/user/dashboard/profile/page.tsx");

  assert.ok(source.includes("locationCodeOverride"));
  assert.ok(profileSource.includes("locationCodeOverride={formData.postcode || currentUser?.postcode}"));
});
