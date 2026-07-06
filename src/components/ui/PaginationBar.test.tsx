import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import PaginationBar, { getPaginationPagesScrollLabel } from './PaginationBar';

test('pagination page numbers stay contained on narrow screens', () => {
  const markup = renderToStaticMarkup(
    <PaginationBar
      currentPage={7}
      totalPages={12}
      onPageChange={() => {}}
      totalItems={120}
      pageSize={10}
      currentItemCount={10}
      itemLabel="users"
    />,
  );

  assert.equal(getPaginationPagesScrollLabel(), 'Scrollable pagination pages');
  assert.match(markup, /flex min-w-0 max-w-full gap-4/);
  assert.match(markup, /aria-label="Scrollable pagination pages"/);
  assert.match(markup, /tabindex="0"/);
  assert.match(markup, /max-w-full min-w-0 items-center gap-2 overflow-x-auto/);
  assert.match(markup, /w-full sm:w-auto/);
  assert.match(markup, /min-w-\[2\.5rem\] shrink-0/);
});
