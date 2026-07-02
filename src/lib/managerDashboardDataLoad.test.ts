import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const dashboardSource = readFileSync(
  resolve(process.cwd(), "src/pages/manager/dashboard/page.tsx"),
  "utf8",
);

test("manager dashboard operational widgets are gated by approved verification", () => {
  assert.match(dashboardSource, /useManagerVerification\(\)/);
  assert.match(dashboardSource, /canLoadManagerOperationalDashboard/);
  assert.match(dashboardSource, /resetOperationalDashboardData/);
  assert.match(dashboardSource, /data-testid="manager-dashboard-readiness-gate"/);
  assert.match(dashboardSource, /enabled: canLoadOperationalDashboard/);

  const dashboardFetchGuard = dashboardSource.match(
    /const fetchDashboardData = useCallback\(async[\s\S]*?if \(!canLoadOperationalDashboard\) \{([\s\S]*?)return;\s*\}/,
  );
  assert.ok(dashboardFetchGuard, "dashboard fetch should short-circuit before operational requests");
  assert.match(dashboardFetchGuard[1], /resetOperationalDashboardData\(\)/);
});
