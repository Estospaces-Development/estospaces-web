import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "NearbyPropertiesMap.tsx"),
  "utf8",
);

test("nearby properties map uses country-aware location copy and currency", () => {
  assert.match(source, /useUserGeoMarket\(user\)/);
  assert.match(source, /getLaunchLocationCodeLabel\(geoMarket\)/);
  assert.match(source, /formatLaunchLocationCodeSentenceLabel\(locationCodeLabel\)/);
  assert.match(source, /Add a \{sentenceLocationCodeLabel\} to unlock the map/);
  assert.match(source, /Use your profile \{sentenceLocationCodeLabel\}/);
  assert.match(source, /formatLaunchCurrencyForCountry\(property\.price/);
  assert.doesNotMatch(source, /Add a PIN code to unlock the map/);
  assert.doesNotMatch(source, /Use your profile PIN code/);
});

test("MapContainer mounts with computed initial center and zoom", () => {
  // The map must seed its initial view from the actual data points,
  // not the legacy hardcoded "India at zoom=6" defaults, so the tile
  // layer loads tiles at the correct zoom on first paint.
  assert.match(source, /const initialView = useMemo\(\(\) =>/);
  assert.match(source, /center=\{initialView\.center\}/);
  assert.match(source, /zoom=\{initialView\.zoom\}/);
  assert.doesNotMatch(
    source,
    /center=\{\[20\.5937, 78\.9629\]\}\s+zoom=\{6\}/,
  );
});

test("MapAutoFit forces a tile layer redraw after fitBounds", () => {
  // Leaflet's tile layer can leave zoom=1 tiles in place after fitBounds
  // when the initial tile batch loaded before fitBounds ran. The fix
  // redraws the tile layer on a short delay to fetch fresh tiles.
  assert.match(source, /map\.invalidateSize\(\)/);
  assert.match(source, /map\.fitBounds\(L\.latLngBounds\(points\)/);
  assert.match(source, /map\.eachLayer/);
  assert.match(source, /redraw\(\)/);
});
