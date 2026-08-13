import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pickerSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/manager/PropertyLocationPicker.tsx",
  ),
  "utf8",
);

test("property location picker replaces manual coordinates with clear actions", () => {
  assert.match(pickerSource, /Find entered address/);
  assert.match(pickerSource, /Use my current location/);
  assert.match(pickerSource, /click or drag the marker to the exact building/);
  assert.doesNotMatch(pickerSource, /type="(?:number|text)"/);
});

test("property location picker saves map clicks and marker drags", () => {
  assert.match(
    pickerSource,
    /if \(!disabled\)[\s\S]*onLocationChange\(event\.latlng\.lat, event\.latlng\.lng\)/,
  );
  assert.match(pickerSource, /draggable=\{!disabled && !busy\}/);
  assert.match(pickerSource, /dragend:\s*\(event\)/);
  assert.match(pickerSource, /onLocationChange\(nextPosition\.lat, nextPosition\.lng\)/);
  assert.match(pickerSource, /aria-label="Fine-tune the property pin"/);
  assert.match(pickerSource, /Move property pin north by about 10 metres/);
  assert.match(pickerSource, /Move property pin west by about 10 metres/);
  assert.match(pickerSource, /Move property pin south by about 10 metres/);
  assert.match(pickerSource, /Move property pin east by about 10 metres/);
});

test("property location picker renders real OpenStreetMap tiles with attribution", () => {
  assert.match(
    pickerSource,
    /https:\/\/\{s\}\.tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/,
  );
  assert.match(pickerSource, /OpenStreetMap/);
  assert.match(pickerSource, /aria-live="polite"/);
  assert.match(pickerSource, /role="alert"/);
  assert.match(pickerSource, /aria-label="Interactive property location map"/);
});
