import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import PaginationBar from '@/components/ui/PaginationBar';
import { paginateItems } from '@/lib/pagination';

const savedPage = readFileSync(new URL('../pages/user/saved/page.tsx', import.meta.url), 'utf8');
const applicationsPage = readFileSync(new URL('../pages/user/applications/page.tsx', import.meta.url), 'utf8');
const viewingsPage = readFileSync(new URL('../pages/user/dashboard/viewings/page.tsx', import.meta.url), 'utf8');
const contractsPage = readFileSync(new URL('../pages/user/dashboard/contracts/page.tsx', import.meta.url), 'utf8');

test('saved homes and saved searches expose pagination even on a single page', () => {
  assert.equal((savedPage.match(/showWhenSinglePage/g) || []).length, 2);
  assert.match(savedPage, /propertyPagination\.items\.map/);
  assert.match(savedPage, /savedSearchPagination\.items\.map/);
});

test('applications and viewings render only their paginated result slices', () => {
  assert.match(applicationsPage, /applicationPagination\.items\.map/);
  assert.match(applicationsPage, /itemLabel="applications"[\s\S]*showWhenSinglePage/);
  assert.match(viewingsPage, /viewingPagination\.items\.map/);
  assert.match(viewingsPage, /itemLabel="viewings"[\s\S]*showWhenSinglePage/);
});

test('my properties and my contracts have independent visible pagination', () => {
  assert.match(contractsPage, /propertyPagination\.items\.map/);
  assert.match(contractsPage, /itemLabel="properties"[\s\S]*showWhenSinglePage/);
  assert.match(contractsPage, /contractPagination\.items\.map/);
  assert.match(contractsPage, /itemLabel="contracts"[\s\S]*showWhenSinglePage/);
  assert.ok(
    contractsPage.indexOf('if (isInitialLoading)') > contractsPage.indexOf('setContractPage(contractPagination.currentPage)'),
    'pagination hooks must run before the initial-loading return',
  );
});

interface PaginationHarnessProps {
  resetKey: string;
}

function PaginationHarness({ resetKey }: PaginationHarnessProps) {
  const [propertyPage, setPropertyPage] = useState(1);
  const [contractPage, setContractPage] = useState(1);
  const properties = Array.from({ length: 12 }, (_, index) => `Property ${index + 1}`);
  const contracts = Array.from({ length: 7 }, (_, index) => `Contract ${index + 1}`);
  const propertyPagination = paginateItems(properties, propertyPage, 5);
  const contractPagination = paginateItems(contracts, contractPage, 3);

  useEffect(() => {
    setPropertyPage(1);
    setContractPage(1);
  }, [resetKey]);

  return (
    <>
      <section data-testid="properties">
        <p>{propertyPagination.items.join(',')}</p>
        <PaginationBar
          currentPage={propertyPagination.currentPage}
          totalPages={propertyPagination.totalPages}
          onPageChange={setPropertyPage}
          totalItems={properties.length}
          pageSize={5}
          currentItemCount={propertyPagination.items.length}
          itemLabel="properties"
          showWhenSinglePage
        />
      </section>
      <section data-testid="contracts">
        <p>{contractPagination.items.join(',')}</p>
        <PaginationBar
          currentPage={contractPagination.currentPage}
          totalPages={contractPagination.totalPages}
          onPageChange={setContractPage}
          totalItems={contracts.length}
          pageSize={3}
          currentItemCount={contractPagination.items.length}
          itemLabel="contracts"
          showWhenSinglePage
        />
      </section>
    </>
  );
}

test('activity pagers switch independently and reset together when filters change', () => {
  const browserWindow = new Window({ url: 'https://estospaces.test/user/dashboard/activity' });
  const globals = globalThis as typeof globalThis & Record<string, unknown>;
  const globalKeys = ['window', 'document', 'HTMLElement', 'Node', 'IS_REACT_ACT_ENVIRONMENT'] as const;
  const previousDescriptors = new Map(
    globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );

  Object.entries({
    window: browserWindow,
    document: browserWindow.document,
    HTMLElement: browserWindow.HTMLElement,
    Node: browserWindow.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
  }).forEach(([key, value]) => {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  });

  const host = browserWindow.document.createElement('div');
  browserWindow.document.body.append(host);
  const root = createRoot(host as unknown as HTMLDivElement);

  try {
    act(() => root.render(<PaginationHarness resetKey="all" />));
    const properties = host.querySelector('[data-testid="properties"]');
    const contracts = host.querySelector('[data-testid="contracts"]');
    assert.ok(properties, 'properties pagination should render');
    assert.ok(contracts, 'contracts pagination should render');
    const propertyNext = Array.from(properties.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Next',
    );

    assert.ok(propertyNext, 'properties next button should render');
    act(() => propertyNext.click());
    assert.match(properties.textContent || '', /Property 6,Property 7,Property 8,Property 9,Property 10/);
    assert.match(properties.textContent || '', /Showing 6-10 of 12 properties/);
    assert.match(contracts.textContent || '', /Showing 1-3 of 7 contracts/);

    act(() => root.render(<PaginationHarness resetKey="filtered" />));
    assert.match(properties.textContent || '', /Showing 1-5 of 12 properties/);
    assert.match(contracts.textContent || '', /Showing 1-3 of 7 contracts/);
  } finally {
    act(() => root.unmount());
    browserWindow.close();
    previousDescriptors.forEach((descriptor, key) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globals[key];
    });
  }
});
