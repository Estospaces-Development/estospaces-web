import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const propertyDetailSource = readFileSync(
  resolve(process.cwd(), "src/pages/user/properties/[id]/page.tsx"),
  "utf8",
);

test("property gallery does not wrap overlay controls in a focusable role button", () => {
  assert.doesNotMatch(
    propertyDetailSource,
    /<div\s+role="button"[\s\S]*?className="relative cursor-zoom-in focus:outline-none"[\s\S]*?<button/,
  );
});

test("property gallery image area remains keyboard accessible", () => {
  assert.match(
    propertyDetailSource,
    /<button\s+type="button"[\s\S]*aria-label=\{`Open image gallery for \$\{property\.title\}`\}/,
  );
  assert.match(propertyDetailSource, /className="[^"]*\bcursor-zoom-in\b[^"]*"/);
});
