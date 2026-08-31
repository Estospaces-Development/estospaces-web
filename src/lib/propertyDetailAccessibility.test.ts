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

test("property detail does not render gallery instructions as listing content", () => {
  assert.doesNotMatch(propertyDetailSource, /Start with the lead image here/);
  assert.doesNotMatch(propertyDetailSource, /Open the full-screen gallery for a closer look/);
  assert.doesNotMatch(propertyDetailSource, /Review the full overview and details below/);
  assert.match(propertyDetailSource, /\{propertySnapshotNarrative\}/);
});

test("property gallery image area remains keyboard accessible", () => {
  assert.match(
    propertyDetailSource,
    /galleryDisplayState\.hasImages \? \(\s*<button[\s\S]*aria-label=\{`Open image gallery for \$\{property\.title\}`\}/,
  );
  assert.match(propertyDetailSource, /\) : \(\s*<div[\s\S]*Property media unavailable for \$\{property\.title\}/);
  assert.doesNotMatch(propertyDetailSource, /disabled=\{!galleryDisplayState\.hasImages\}/);
  assert.match(propertyDetailSource, /cursor-zoom-in/);
});

test("property gallery releases modal state when media becomes empty", () => {
  assert.match(
    propertyDetailSource,
    /if \(images\.length === 0\) \{\s*setIsGalleryOpen\(false\);\s*\}/,
  );
});

test("property gallery reflows into an image-first narrow-phone experience", () => {
  assert.match(propertyDetailSource, /data-mobile-property-hero/);
  assert.match(propertyDetailSource, /data-mobile-property-summary/);
  assert.match(propertyDetailSource, /data-mobile-gallery-dock/);
  assert.doesNotMatch(propertyDetailSource, /Tap the image for the full-screen gallery/);
  assert.match(propertyDetailSource, /aria-label=\{`Open full-screen gallery for \$\{property\.title\}`\}/);
  assert.match(propertyDetailSource, /h-\[100dvh\][^\n]+overflow-hidden/);
  assert.match(propertyDetailSource, /grid-rows-\[minmax\(0,1fr\)_auto\][^\n]+lg:grid-rows-1/);
  assert.match(propertyDetailSource, /h-14 w-16[^\n]+lg:h-28 lg:w-full/);
  assert.match(propertyDetailSource, /hidden rounded-\[1\.8rem\][^\n]+lg:block/);
  assert.match(propertyDetailSource, /hidden flex-wrap gap-2 sm:flex/);
  assert.match(propertyDetailSource, /hidden min-h-11 items-center[^\n]+sm:inline-flex/);
  assert.match(propertyDetailSource, /hidden rounded-full[^\n]+lg:block/);
  assert.match(propertyDetailSource, /w-full min-w-0 max-w-\[1500px\][^\n]+overflow-hidden/);
  assert.match(propertyDetailSource, /grid min-h-0 w-full min-w-0 flex-1/);
});
