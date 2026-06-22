import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import FAQPage from "./page";

test("public FAQ route does not advertise inactive payments or billing", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <FAQPage />
    </MemoryRouter>,
  );

  assert.doesNotMatch(markup, />Payments</);
  assert.doesNotMatch(markup, /payment methods/i);
  assert.doesNotMatch(markup, /pay my rent/i);
  assert.doesNotMatch(markup, /billing/i);
});

test("public FAQ contact link stays visibly distinct inside body copy", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <FAQPage />
    </MemoryRouter>,
  );

  assert.match(markup, /class="text-orange-700 underline decoration-2 underline-offset-4 hover:text-orange-800"/);
});
