import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const timeFieldSource = () => readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "TimeField.tsx"),
  "utf8",
);

test("time field commits native input and change events", () => {
  const source = timeFieldSource();

  assert.match(source, /const commitTimeValue = useCallback/);
  assert.match(source, /onInput=\{commitTimeValue\}/);
  assert.match(source, /onChange=\{commitTimeValue\}/);
});
