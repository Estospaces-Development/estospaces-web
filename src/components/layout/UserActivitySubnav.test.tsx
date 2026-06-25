import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import UserActivitySubnav from "./UserActivitySubnav";

test("user activity subnav includes virtual storage", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/user/virtual-storage"]}>
      <UserActivitySubnav />
    </MemoryRouter>,
  );

  assert.match(markup, /Virtual Storage/);
  assert.match(markup, /Document vault/);
  assert.match(markup, /aria-current="page"/);
});

test("user activity subnav includes fast track", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/user/dashboard/fast-track"]}>
      <UserActivitySubnav />
    </MemoryRouter>,
  );

  assert.match(markup, /Fast Track/);
  assert.match(markup, /Active cases/);
  assert.match(markup, /aria-current="page"/);
});
