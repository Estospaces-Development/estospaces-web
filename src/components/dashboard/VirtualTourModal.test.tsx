import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { ToastProvider } from "@/contexts/ToastContext";
import VirtualTourModal from "./VirtualTourModal";

test("virtual tour modal exposes dismissible dialog semantics", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <ToastProvider>
        <VirtualTourModal
          property={{ id: "property-1", title: "Canary Wharf Loft" }}
          onClose={() => {}}
        />
      </ToastProvider>
    </MemoryRouter>,
  );

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-label="Close virtual tour"/);
  assert.match(markup, /id="virtual-tour-modal-title"/);
});
