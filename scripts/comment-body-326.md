### ✅ Fixed — Code Verified

**Ticket #326**: "Homes near you" map shows fully zoomed-out world view instead of localized view

**Fix**: Added (0,0) sentinel guard in `src/components/dashboard/NearbyPropertiesMap.tsx` (lines 316-326). When the location service returns (0,0) as a fallback after geocoding failure, the map no longer zooms to the entire world. The user position is only added to map points when coordinates are non-zero.

**File changed**: `NearbyPropertiesMap.tsx` — `useMemo` for `initialView` now checks `!(latitude === 0 && longitude === 0)` before setting user location.

**Verification**: Code review + Playwright e2e test pass. Screenshot: `test-results/screenshots/ticket-fixes/issue-326-result.png`

⚠️ **Note**: GitHub Project board status update is **blocked** — the auth token lacks the `project` write scope (only `read:project` is available). Please manually move this ticket to **QA Testing** column on the project board.

Closes #326
