import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "NearbyPropertiesMap.tsx"),
  "utf8",
);

test("nearby properties map uses profile location and each property's currency", () => {
  assert.match(source, /useUserGeoMarket\(user\)/);
  assert.match(source, /getLaunchLocationCodeLabel\(geoMarket\)/);
  assert.match(source, /getNearbyMapEmptyState\(properties, compact, locationCodeLabel\)/);
  assert.match(source, /\{emptyState\.title\}/);
  assert.match(source, /\{emptyState\.description\}/);
  assert.match(source, /emptyState\.actionLabel/);
  assert.match(source, /navigate\('\/user\/dashboard\/settings'\)/);
  assert.match(source, /formatMapPropertyPrice\(property/);
  assert.doesNotMatch(source, /formatMapPriceInRupees/);
  assert.doesNotMatch(source, /Add a PIN code to unlock the map/);
  assert.doesNotMatch(source, /Use your profile PIN code/);
});

test('compact dashboard map selects only real nearby coordinates and reset re-applies bounds', () => {
  assert.match(source, /compact\s*\?\s*selectDashboardNearbyProperties\(properties, userLocation\)/);
  assert.match(source, /properties\.filter\(hasVerifiedPropertyMapCoordinates\)/);
  assert.match(source, /\[fitSignal, map, properties, userLocation\]/);
  assert.match(source, /worldCopyJump/);
  assert.equal((source.match(/noWrap/g) || []).length, 2);
});

test('standard dashboard map uses the reviewed keyless tile provider contract', () => {
  assert.match(source, /STANDARD_MAP_TILE_LAYER\.attribution/);
  assert.match(source, /STANDARD_MAP_TILE_LAYER\.url/);
  assert.doesNotMatch(source, /basemaps\.cartocdn\.com/);
});
