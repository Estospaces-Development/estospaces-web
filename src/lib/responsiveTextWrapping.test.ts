import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

test("manager dashboard property cards allow long titles and addresses to wrap", () => {
  const source = readFileSync(
    resolve(root, "src/components/dashboard/ManagerPropertyCard.tsx"),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /<h3 className="[^"]*\btruncate\b[^"]*">\{title\}<\/h3>/,
  );
  assert.doesNotMatch(
    source,
    /<p className="[^"]*\btruncate\b[^"]*">\s*<MapPin[\s\S]*?\{address\}\s*<\/p>/,
  );
  assert.match(source, /<h[23] className="[^"]*\bbreak-words\b[^"]*">\{title\}<\/h[23]>/);
  assert.match(source, /<span className="[^"]*\bbreak-words\b[^"]*">\{address\}<\/span>/);
});

test("admin dashboard recent notification titles wrap on narrow screens", () => {
  const source = readFileSync(
    resolve(root, "src/pages/admin/dashboard/page.tsx"),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /<p className="[^"]*\btruncate\b[^"]*">\s*\{notification\.title\}\s*<\/p>/,
  );
  assert.match(
    source,
    /<p className="[^"]*\bbreak-words\b[^"]*">\s*\{displayCopy\.title\}\s*<\/p>/,
  );
});

test("admin header page titles wrap instead of truncating on small screens", () => {
  const source = readFileSync(
    resolve(root, "src/components/layout/AdminHeader.tsx"),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /<h1 className="[^"]*\btruncate\b[^"]*">\{getPageTitle\(\)\}<\/h1>/,
  );
  assert.match(
    source,
    /<h1 className="[^"]*\bbreak-words\b[^"]*">\{getPageTitle\(\)\}<\/h1>/,
  );
});

test("admin notifications can wrap generated property names inside messages", () => {
  const source = readFileSync(
    resolve(root, "src/pages/admin/notifications/page.tsx"),
    "utf8",
  );

  assert.match(
    source,
    /<p className="[^"]*\[overflow-wrap:anywhere\][^"]*">\{displayCopy\.message\}<\/p>/,
  );
});
