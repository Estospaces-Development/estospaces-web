import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../components/dashboard/PropertyContactInfo.tsx", import.meta.url), "utf8");

test("#460 contact location is plain text, not styled like the clickable phone and email cards", () => {
  const start = source.indexOf("data-contact-location");
  assert.ok(start > 0, "location row is marked");
  const row = source.slice(start, source.indexOf("</div>", start));
  assert.doesNotMatch(row, /border|rounded-\[1\.45rem\]|bg-white|hover:/);
  assert.doesNotMatch(row, /<a |href=|onClick/);
});
