import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SaleOfferEntryCard } from "../pages/user/properties/[id]/page";

test("sale offer amount input accepts ordinary round-pound offers", () => {
  const markup = renderToStaticMarkup(
    <SaleOfferEntryCard
      priceLabel="GBP 425,000"
      offerAmount="11000"
      offerNotes=""
      isSubmitting={false}
      onAmountChange={() => {}}
      onNotesChange={() => {}}
      onSubmit={() => {}}
    />,
  );

  assert.match(markup, /\stype="number"/);
  assert.match(markup, /\smin="1"/);
  assert.match(markup, /\sstep="1"(?:\s|>)/);
  assert.doesNotMatch(markup, /\sstep="1000"(?:\s|>)/);
});
