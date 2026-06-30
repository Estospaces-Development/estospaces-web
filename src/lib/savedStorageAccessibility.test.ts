import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const savedPage = readFileSync(resolve(root, "src/pages/user/saved/page.tsx"), "utf8");
const propertyCard = readFileSync(resolve(root, "src/components/dashboard/PropertyCard.tsx"), "utf8");
const virtualStoragePage = readFileSync(resolve(root, "src/pages/user/virtual-storage/page.tsx"), "utf8");

test("saved page exposes tab state and stable button behavior", () => {
  assert.match(savedPage, /aria-pressed=\{activeTab === 'properties'\}/);
  assert.match(savedPage, /aria-pressed=\{activeTab === 'searches'\}/);
  assert.match(savedPage, /type="button"[\s\S]*?onClick=\{\(\) => navigate\('\/user\/dashboard'\)\}/);
  assert.match(savedPage, /type="button"[\s\S]*?onClick=\{\(e\) => onRemove\(e, property\.id\)\}/);
});

test("saved page renders one remove action per saved card", () => {
  assert.match(propertyCard, /showSaveAction\?: boolean/);
  assert.match(propertyCard, /showSaveAction = true/);
  assert.match(propertyCard, /\{showSaveAction && \(/);
  assert.match(savedPage, /<PropertyCard property=\{property\} showSaveAction=\{false\} \/>/);
});

test("saved page keeps properties and searches headings below the page title", () => {
  assert.match(savedPage, /<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Error loading saved properties<\/h2>/);
  assert.match(savedPage, /<h2 className="text-lg font-semibold text-gray-900 dark:text-white">No saved properties match<\/h2>/);
  assert.match(savedPage, /<h2 className="text-lg font-semibold text-gray-900 dark:text-white">No saved properties yet<\/h2>/);
  assert.match(savedPage, /<h2 className="mobile-safe-text min-w-0 break-words text-lg font-bold text-gray-900 dark:text-white">\{search\.name\}<\/h2>/);
});

test("virtual storage exposes category selection and upload form names", () => {
  assert.match(virtualStoragePage, /aria-pressed=\{selectedCategoryId === category\.id\}/);
  assert.match(virtualStoragePage, /aria-label="New custom category name"/);
  assert.match(virtualStoragePage, /htmlFor="virtual-storage-category"/);
  assert.match(virtualStoragePage, /id="virtual-storage-category"/);
  assert.match(virtualStoragePage, /htmlFor="virtual-storage-file"/);
  assert.match(virtualStoragePage, /id="virtual-storage-file"/);
});
