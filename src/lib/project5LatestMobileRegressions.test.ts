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

test("nearby map reset reapplies bounds and restores the default presentation", () => {
  const source = readSource("components/dashboard/NearbyPropertiesMap.tsx");

  assert.match(source, /\[apply, fitSignal\]/);
  assert.match(source, /setMapStyle\('standard'\)/);
  assert.match(source, /setIsSelectionDismissed\(false\)/);
  assert.match(source, /setSelectedPropertyID\(propertiesWithCoords\[0\]\?\.id \|\| null\)/);
  assert.match(source, /setFitSignal\(\(value\) => value \+ 1\)/);
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
