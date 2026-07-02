import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const managerLayoutSource = readFileSync(
  resolve(process.cwd(), "src/components/layout/ManagerLayoutClient.tsx"),
  "utf8",
);

test("manager operational providers only mount after verification approval", () => {
  assert.match(managerLayoutSource, /function ManagerOperationalProviders/);
  assert.match(managerLayoutSource, /useManagerVerification\(\)/);
  assert.match(managerLayoutSource, /const \{ isVerified \} = useManagerVerification\(\)/);
  assert.match(managerLayoutSource, /if \(!isVerified\) \{/);
  assert.match(managerLayoutSource, /<PropertyProvider scope="manager">/);
  assert.match(managerLayoutSource, /<LeadProvider>/);
  assert.match(managerLayoutSource, /<MessagesProvider>/);
  assert.match(managerLayoutSource, /<ManagerOperationalProviders>/);
});
