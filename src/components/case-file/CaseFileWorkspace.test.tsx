import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CaseFileBulkFileChooser } from "./CaseFileWorkspace";

test("case-file bulk file chooser exposes a named file input with visible focus", () => {
  const markup = renderToStaticMarkup(
    <CaseFileBulkFileChooser onFilesSelected={() => {}} />,
  );

  assert.match(markup, /type="file"/);
  assert.match(markup, /data-case-file-bulk-file-input="true"/);
  assert.match(markup, /aria-label="Choose case-file documents to upload"/);
  assert.match(markup, /peer-focus-visible:ring-2/);
});
