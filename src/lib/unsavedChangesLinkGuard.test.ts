import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { getGuardedInAppNavigationTarget } from "@/lib/unsavedChangesLinkGuard";

const editorUrl = "https://app.example.test/manager/dashboard/properties/edit/p-1";
const plainClick = {
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};
const link = (href: string, extra: Partial<{ target: string; hasDownload: boolean }> = {}) => ({
  href,
  target: "",
  hasDownload: false,
  ...extra,
});

test("a plain click on an in-app link such as the sidebar is guarded", () => {
  assert.equal(
    getGuardedInAppNavigationTarget(plainClick, link("/manager/dashboard/properties"), editorUrl),
    "/manager/dashboard/properties",
  );
  assert.equal(
    getGuardedInAppNavigationTarget(
      plainClick,
      link("https://app.example.test/manager/help?ticket=1#reply"),
      editorUrl,
    ),
    "/manager/help?ticket=1#reply",
  );
});

test("new-tab, modified, external, download and same-page clicks are not guarded", () => {
  const cases = [
    getGuardedInAppNavigationTarget({ ...plainClick, metaKey: true }, link("/manager"), editorUrl),
    getGuardedInAppNavigationTarget({ ...plainClick, ctrlKey: true }, link("/manager"), editorUrl),
    getGuardedInAppNavigationTarget({ ...plainClick, button: 1 }, link("/manager"), editorUrl),
    getGuardedInAppNavigationTarget({ ...plainClick, defaultPrevented: true }, link("/manager"), editorUrl),
    getGuardedInAppNavigationTarget(plainClick, link("/manager", { target: "_blank" }), editorUrl),
    getGuardedInAppNavigationTarget(plainClick, link("/files/a.pdf", { hasDownload: true }), editorUrl),
    getGuardedInAppNavigationTarget(plainClick, link("https://other.example.test/"), editorUrl),
    getGuardedInAppNavigationTarget(plainClick, link(`${editorUrl}#media`), editorUrl),
  ];

  assert.deepEqual(cases, cases.map(() => null));
});

test("the property editor guards in-app links and no longer offers an unsaved short description", () => {
  const page = readFileSync(
    resolve(process.cwd(), "src/pages/manager/dashboard/properties/add/page.tsx"),
    "utf8",
  );

  assert.match(page, /useUnsavedChangesLinkGuard\(isDirty && !saving, setPendingUnsavedNavigation\)/);
  assert.match(page, /window\.addEventListener\("beforeunload"/);
  assert.doesNotMatch(page, /shortDescription|Short Description/);
  assert.match(page, /validateManagerPropertySave\(getValidationValues\(formData\)/);
});
