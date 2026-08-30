import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const readSource = (path: string) => readFileSync(join(srcRoot, path), "utf8");

test("Home Choices content can wrap without being squeezed by its deadline card", () => {
  const source = readSource("components/dashboard/BrokerRequestWidget.tsx");

  assert.match(source, /flex min-w-0 flex-col gap-3 sm:flex-row/);
  assert.match(source, /min-w-0 flex-1/);
  assert.match(source, /break-words text-sm font-semibold/);
  assert.match(source, /sm:w-auto sm:shrink-0 sm:whitespace-nowrap sm:text-right/);
});

test("matched agent requests use compact progressive disclosure on phones", () => {
  const source = readSource("components/dashboard/BrokerRequestWidget.tsx");

  assert.match(source, /data-mobile-broker-request/);
  assert.match(source, /<details className="group mt-3[^\n]+md:hidden"/);
  assert.match(source, />Request details</);
  assert.match(source, /mt-4 hidden gap-3 md:grid md:grid-cols-3/);
  assert.match(source, /hidden min-w-\[180px\][^\n]+sm:block/);
  assert.match(source, /mt-5 hidden gap-3 sm:grid sm:grid-cols-2/);
  assert.match(source, /min-h-11 w-full[^\n]+sm:w-auto/);
  assert.match(source, /View \{matchedExperienceSteps\.length\} next steps/);
  assert.match(source, /mt-4 hidden gap-3 sm:grid md:grid-cols-3/);
  assert.match(source, /Next step/);
  assert.match(source, /open=\{Boolean\(selectedProperty \|\| availableSharedProperties\.length > 0\)\}/);
  assert.match(source, /Waiting for home choices/);
  assert.match(source, />Start a different request</);
  assert.match(source, /onClick=\{handleStartAnotherRequest\}/);
  assert.match(source, /activeRequest \? 'hidden sm:block' : 'block'/);
});

test("journey progress uses a compact phone header and discloses secondary controls on demand", () => {
  const source = readSource("components/dashboard/ApplicationTimelineWidget.tsx");

  assert.match(source, /grid min-w-0 grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(source, /whitespace-nowrap rounded-full bg-green-100/);
  assert.match(source, /flex snap-x gap-1 overflow-x-auto/);
  assert.match(source, /> Filter and sort</);
  assert.match(source, /hidden gap-3 pt-3 group-open:grid sm:grid/);
  assert.match(source, /grid grid-cols-\[44px_minmax\(0,1fr\)\]/);
  assert.match(source, /item\.source === 'broker_request' \? 'Agent request'/);
  assert.match(source, /text-xs font-medium text-gray-900[^\n]+sm:text-base sm:font-semibold/);
});

test("283px dashboard hierarchy uses lighter type and stacked narrow-phone groups", () => {
  const dashboard = readSource("pages/user/dashboard/DashboardClient.tsx");
  const requestWidget = readSource("components/dashboard/BrokerRequestWidget.tsx");
  const nearbyAgents = readSource("components/dashboard/NearbyAgenciesList.tsx");

  assert.match(dashboard, /data-mobile-primary-task/);
  assert.match(dashboard, /text-xl font-semibold leading-tight/);
  assert.match(dashboard, /min-h-11[^\n]+text-sm font-medium/);
  assert.match(requestWidget, /grid gap-2 sm:flex sm:items-start sm:justify-between/);
  assert.match(requestWidget, /Find an agent and matching homes\./);
  assert.match(requestWidget, /block sm:flex sm:items-center sm:justify-between/);
  assert.match(requestWidget, /grid min-w-0 gap-2[^\n]+sm:flex sm:items-start/);
  assert.match(nearbyAgents, /data-mobile-nearby-agencies/);
  assert.match(nearbyAgents, /grid min-w-0 gap-1 sm:flex/);
});

test("nearby map reset reapplies bounds and restores the default presentation", () => {
  const source = readSource("components/dashboard/NearbyPropertiesMap.tsx");

  assert.match(source, /\[apply, fitSignal\]/);
  assert.match(source, /setMapStyle\('standard'\)/);
  assert.match(source, /setIsSelectionDismissed\(false\)/);
  assert.match(source, /setSelectedPropertyID\(propertiesWithCoords\[0\]\?\.id \|\| null\)/);
  assert.match(source, /setFitSignal\(\(value\) => value \+ 1\)/);
});

test("dashboard map recomposes controls and supporting copy for narrow phones", () => {
  const dashboard = readSource("pages/user/dashboard/DashboardClient.tsx");
  const map = readSource("components/dashboard/NearbyPropertiesMap.tsx");
  const helpers = readSource("lib/nearbyMap.ts");

  assert.match(dashboard, /data-mobile-nearby-map-section/);
  assert.match(dashboard, /grid min-w-0 gap-2\.5 sm:mb-4 sm:flex/);
  assert.match(dashboard, />Open Discover</);
  assert.doesNotMatch(dashboard, /This is a compact preview\. Open Browse All for the full map experience\./);
  assert.match(map, /grid w-full grid-cols-3 gap-1 rounded-xl/);
  assert.match(map, /hidden bg-gradient-to-t[\s\S]*sm:block/);
  assert.match(helpers, /h-\[260px\] min-\[340px\]:h-\[280px\]/);
});

test("applications grid and list controls render structurally different views", () => {
  const source = readSource("pages/user/applications/page.tsx");

  assert.match(source, /data-application-view-mode=\{viewMode\}/);
  assert.match(source, /viewMode === 'grid' \? 'grid grid-cols-1 gap-6 lg:grid-cols-2' : 'space-y-3'/);
  assert.match(source, /viewMode === 'grid' \? \(/);
  assert.match(source, /<ChevronRight className="h-4 w-4 shrink-0 text-gray-400"/);
});

test("contract deep links open the requested contract instead of only focusing its row", () => {
  const source = readSource("pages/user/dashboard/contracts/page.tsx");

  assert.match(source, /const openContractDetail = useCallback\(async \(contract: Contract\) =>/);
  assert.match(source, /void openContractDetail\(focusedContract\)/);
  assert.match(source, /\[focusedContract, hasAppliedRouteFocus, openContractDetail\]/);
});

test("manager property controls remain usable on narrow screens", () => {
  const source = readSource("pages/manager/dashboard/properties/page.tsx");

  assert.match(source, /flex w-full flex-wrap items-center justify-between gap-2 lg:w-auto lg:justify-end/);
  assert.match(source, /right-0 z-50 mt-2 w-\[min\(14rem,calc\(100vw-2rem\)\)\]/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /<table className="min-w-\[760px\] w-full text-left">/);
});

test("manager notification timestamps stack below titles on mobile", () => {
  const source = readSource("pages/manager/notifications/page.tsx");

  assert.match(source, /flex min-w-0 flex-col gap-1 sm:flex-row/);
  assert.match(source, /shrink-0 whitespace-nowrap text-xs leading-5/);
});

test("manager case-file documents follow both light and dark themes", () => {
  const source = readSource("components/case-file/CaseFileWorkspace.tsx");

  assert.match(source, /border-gray-200 bg-white p-6 shadow-sm dark:border-\[#262626\] dark:bg-\[#050505\]/);
  assert.match(source, /border-orange-200 bg-orange-50\/70 p-5 shadow-sm dark:border-\[#35261a\] dark:bg-\[#101010\]/);
  assert.match(source, /border-gray-200 bg-gray-50 p-5 shadow-sm dark:border-\[#252525\] dark:bg-\[#0c0c0c\]/);
});

test("role guides surface actions before supporting desktop detail on phones", () => {
  const source = readSource("components/docs/RoleDocsPage.tsx");

  assert.match(source, /hidden gap-4 sm:grid/);
  assert.match(source, /mt-5 grid grid-cols-2 gap-3/);
  assert.match(source, /hidden text-sm leading-6[\s\S]*sm:block/);
});

test("user notification and virtual-storage metrics stay compact on phones", () => {
  const notifications = readSource("pages/user/dashboard/notifications/page.tsx");
  const storage = readSource("pages/user/virtual-storage/page.tsx");

  assert.match(notifications, /mt-5 grid grid-cols-3 gap-2/);
  assert.match(storage, /grid grid-cols-2 gap-3/);
});

test("mobile property detail keeps price and actions ahead of supporting content", () => {
  const source = readSource("pages/user/properties/[id]/page.tsx");

  assert.match(source, /line-clamp-4 max-w-2xl/);
  assert.match(source, /mt-6 hidden sm:block/);
});

test("overseas discovery keeps its hero copy readable on dark imagery", () => {
  const source = readSource("pages/user/dashboard/overseas/page.tsx");

  assert.match(source, /text-white\/85 dark:text-gray-600/);
  assert.match(source, /px-5 py-10 text-center/);
});

test("manager summary metrics use compact phone grids", () => {
  const appointments = readSource("pages/manager/appointments/page.tsx");
  const verification = readSource("components/verification/UserVerificationQueue.tsx");
  const community = readSource("components/community/CommunityStats.tsx");

  assert.match(appointments, /grid grid-cols-2 gap-3 min-\[360px\]:grid-cols-3/);
  assert.match(verification, /grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4/);
  assert.match(community, /grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4/);
});

test("admin operational metrics use compact phone grids", () => {
  const analytics = readSource("pages/admin/analytics/page.tsx");
  const research = readSource("pages/admin/research/page.tsx");
  const users = readSource("pages/admin/users/page.tsx");
  const notifications = readSource("pages/admin/notifications/page.tsx");

  assert.match(analytics, /grid grid-cols-2 gap-3/);
  assert.match(research, /grid grid-cols-2 gap-3/);
  assert.match(users, /grid grid-cols-2 gap-3 lg:grid-cols-4/);
  assert.match(notifications, /mt-5 grid grid-cols-3 gap-2/);
  assert.doesNotMatch(notifications, /Opens \{targetPath\}/);

  const dashboard = readSource("pages/admin/dashboard/page.tsx");
  assert.equal((dashboard.match(/flex min-w-0 flex-col items-start gap-2 min-\[360px\]:flex-row/g) || []).length, 4);
});

test("narrow-phone guides wrap safely and settings tabs stay fully visible", () => {
  const docs = readSource("components/docs/RoleDocsPage.tsx");
  const settings = readSource("pages/user/dashboard/settings/page.tsx");

  assert.match(docs, /min-w-0 max-w-4xl/);
  assert.match(docs, /break-words text-2xl[\s\S]*\[overflow-wrap:anywhere\]/);
  assert.match(settings, /grid grid-cols-2 gap-2/);
  assert.match(settings, /min-h-12 min-w-0 items-center justify-center/);
});
