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

test("manager layout exposes sidebar offset for nested fixed workspaces", () => {
  assert.match(managerLayoutSource, /--workspace-sidebar-offset/);
  assert.match(managerLayoutSource, /--workspace-header-height/);
  assert.match(managerLayoutSource, /sidebarOpen \? '16rem' : '5rem'/);
  assert.match(managerLayoutSource, /root\.style\.setProperty\('--workspace-sidebar-offset', sidebarOpen \? '16rem' : '5rem'\)/);
  assert.match(managerLayoutSource, /root\.style\.setProperty\('--workspace-header-height', '4rem'\)/);
  assert.match(managerLayoutSource, /root\.style\.removeProperty\('--workspace-sidebar-offset'\)/);
  assert.match(managerLayoutSource, /root\.style\.removeProperty\('--workspace-header-height'\)/);
});
