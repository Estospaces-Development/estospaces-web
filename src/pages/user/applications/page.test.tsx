import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("application detail drawer close control has an accessible name", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

  assert.match(source, /APPLICATION_DETAIL_DRAWER_CLOSE_LABEL/);
  assert.match(source, /aria-label=\{APPLICATION_DETAIL_DRAWER_CLOSE_LABEL\}/);
});
