import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import HomePage from "./page";

test("public home route renders a signed-out landing surface", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

  assert.match(markup, /Estospaces/);
  assert.match(markup, /Find verified spaces/);
  assert.match(markup, /Search properties/);
  assert.match(markup, /List your property/);
});
