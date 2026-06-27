import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const verificationSectionSource = () => readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "VerificationSection.tsx"),
  "utf8",
);

test("profile verification identity upload copy names accepted identity documents", () => {
  const source = verificationSectionSource();

  assert.match(source, /Aadhaar proof, passport, voter ID, driving licence, NREGA job card, or NPR letter/);
  assert.match(source, /PAN\/Form 60 may be requested separately/);
  assert.match(source, /Recent utility bill, bank statement, rent agreement/);
  assert.match(source, /description=\{verificationDocumentGuidance\.identity\}/);
});
