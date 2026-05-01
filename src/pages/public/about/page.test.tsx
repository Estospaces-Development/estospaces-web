import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import AboutPage from "./page";

test("public about route explains the Estospaces platform", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  );

  assert.match(markup, /About Estospaces/);
  assert.match(markup, /fast-track/);
  assert.match(markup, /property managers/);
  assert.match(markup, /Contact us/);
});
