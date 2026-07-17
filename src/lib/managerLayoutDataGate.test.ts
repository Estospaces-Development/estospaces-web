import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const managerLayoutSource = readFileSync(
  resolve(process.cwd(), "src/components/layout/ManagerLayoutClient.tsx"),
  "utf8",
);

test("manager operational providers stay mounted but load only after approval", () => {
  assert.match(managerLayoutSource, /function ManagerOperationalProviders/);
  assert.match(managerLayoutSource, /useManagerVerification\(\)/);
  assert.match(managerLayoutSource, /operationalDataEnabled = !isLoading && isVerified/);
  assert.match(managerLayoutSource, /<PropertyProvider scope="manager" enabled=\{operationalDataEnabled\}>/);
  assert.match(managerLayoutSource, /<LeadProvider enabled=\{operationalDataEnabled\}>/);
  assert.match(managerLayoutSource, /<MessagesProvider>\{children\}<\/MessagesProvider>/);
  assert.match(managerLayoutSource, /<ManagerVerificationProvider>\s*<ManagerOperationalProviders>/);
});

test("reported direct operational routes require manager approval", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

  assert.match(appSource, /function VerifiedManagerRoute/);
  assert.match(appSource, /if \(!isVerified\) \{\s*return <Navigate to="\/manager\/dashboard" replace \/>/);
  assert.match(appSource, /path="analytics" element=\{<VerifiedManagerRoute><ManagerAnalytics \/><\/VerifiedManagerRoute>\}/);
  assert.match(appSource, /path="appointments" element=\{<VerifiedManagerRoute><ManagerAppointments \/><\/VerifiedManagerRoute>\}/);
  assert.match(appSource, /path="contracts" element=\{<VerifiedManagerRoute><ManagerContracts \/><\/VerifiedManagerRoute>\}/);
});

test("manager provider loaders remain empty until verification is approved", () => {
  const propertySource = readFileSync(resolve(process.cwd(), "src/contexts/PropertyContext.tsx"), "utf8");
  const leadSource = readFileSync(resolve(process.cwd(), "src/contexts/LeadContext.tsx"), "utf8");
  const verificationSource = readFileSync(resolve(process.cwd(), "src/contexts/ManagerVerificationContext.tsx"), "utf8");

  assert.match(propertySource, /enabled = true/);
  assert.match(propertySource, /if \(isAuthRoute \|\| !enabled\) \{/);
  assert.match(propertySource, /enabled: enabled && !isAuthRoute/);
  assert.match(leadSource, /enabled = true/);
  assert.match(leadSource, /if \(!enabled\) \{\s*setLeads\(\[\]\)/);
  assert.match(leadSource, /enabled: enabled && isInitialized/);
  assert.match(verificationSource, /pathname\.startsWith\('\/manager'\)/);
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
