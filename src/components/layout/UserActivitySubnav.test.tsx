import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import UserActivitySubnav from "./UserActivitySubnav";

const renderActivitySubnav = (path: string) => renderToStaticMarkup(
  <MemoryRouter initialEntries={[path]}>
    <UserActivitySubnav />
  </MemoryRouter>,
);

const assertOnlyActive = (markup: string, path: string) => {
  const links = [...markup.matchAll(/<a\s+([^>]+)>/g)].map((match) => match[1]);
  const activeLinks = links.filter((attributes) => attributes.includes('aria-current="page"'));

  assert.equal(activeLinks.length, 1);
  assert.match(activeLinks[0] || '', new RegExp(`href="${path}"`));
};

test("user activity subnav highlights each canonical activity route", () => {
  const savedMarkup = renderActivitySubnav("/user/dashboard/saved");
  const applicationsMarkup = renderActivitySubnav("/user/dashboard/applications");
  const storageMarkup = renderActivitySubnav("/user/dashboard/virtual-storage");

  assert.match(storageMarkup, /Virtual Storage/);
  assert.match(storageMarkup, /Document vault/);
  assertOnlyActive(savedMarkup, "/user/dashboard/saved");
  assertOnlyActive(applicationsMarkup, "/user/dashboard/applications");
  assertOnlyActive(storageMarkup, "/user/dashboard/virtual-storage");
  assert.doesNotMatch(storageMarkup, /href="\/user\/dashboard\/fast-track"[^>]*aria-current="page"/);
});

test("user activity subnav includes fast track", () => {
  const markup = renderActivitySubnav("/user/dashboard/fast-track");

  assert.match(markup, /Fast Track/);
  assert.match(markup, /Active cases/);
  assertOnlyActive(markup, "/user/dashboard/fast-track");
});
