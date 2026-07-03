import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const managerLayoutSource = readFileSync(
  resolve(process.cwd(), "src/components/layout/ManagerLayoutClient.tsx"),
  "utf8",
);

test("manager operational providers stay mounted for every manager route", () => {
  assert.doesNotMatch(managerLayoutSource, /function ManagerOperationalProviders/);
  assert.doesNotMatch(managerLayoutSource, /useManagerVerification\(\)/);
  assert.doesNotMatch(managerLayoutSource, /if \(!isVerified\) \{/);
  assert.match(managerLayoutSource, /<PropertyProvider scope="manager">/);
  assert.match(managerLayoutSource, /<LeadProvider>/);
  assert.match(managerLayoutSource, /<MessagesProvider>/);
  assert.match(managerLayoutSource, /<ManagerVerificationProvider>\s*<PropertyProvider scope="manager">/);
});
