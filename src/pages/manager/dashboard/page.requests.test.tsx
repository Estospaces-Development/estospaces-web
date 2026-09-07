import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import ts from 'typescript';

import type { getUserProperties } from '@/services/userPropertiesService';
import PaginationBar from '@/components/ui/PaginationBar';

type PropertyQuery = NonNullable<Parameters<typeof getUserProperties>[0]>;
type PropertyResponse = Awaited<ReturnType<typeof getUserProperties>>;

const deferred = <T,>() => {
  let complete!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { complete = resolvePromise; });
  return { promise, complete };
};

const response = (prefix: string, total: number, page = 1): PropertyResponse => ({
  data: Array.from({ length: Math.min(6, Math.max(0, total - (page - 1) * 6)) }, (_, index) => ({
    id: `${prefix}-${index}`, title: `${prefix}-${index}`, status: 'draft',
  })),
  pagination: {
    page, limit: 6, total, totalCount: total, totalPages: Math.max(1, Math.ceil(total / 6)),
    hasNextPage: page < Math.ceil(total / 6), hasPreviousPage: page > 1,
  },
  error: null,
});

const installDashboard = async () => {
  const browserWindow = new Window({ url: 'https://estospaces.test/manager/dashboard' });
  const replacements = {
    window: browserWindow, document: browserWindow.document, navigator: browserWindow.navigator,
    HTMLElement: browserWindow.HTMLElement, Element: browserWindow.Element, Node: browserWindow.Node,
    Event: browserWindow.Event, IS_REACT_ACT_ENVIRONMENT: true,
  };
  const descriptors = new Map(Object.keys(replacements).map((key) => (
    [key, Object.getOwnPropertyDescriptor(globalThis, key)]
  )));
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }

  const timers = new Map<ReturnType<typeof browserWindow.setTimeout>, () => void>();
  browserWindow.setTimeout = (callback, _delay, ...args) => {
    const id = setTimeout(() => {}, 0);
    clearTimeout(id);
    timers.set(id, () => { callback(...args); });
    return id;
  };
  browserWindow.clearTimeout = (id) => { timers.delete(id); };

  const requests: Array<ReturnType<typeof deferred<PropertyResponse>> & { query: PropertyQuery }> = [];
  const bookings = deferred<[]>();
  let refresh: () => Promise<void> = async () => {};
  const location = { pathname: '/manager/dashboard', search: '' };
  const navigate = () => {};
  const toast = { success() {}, error() {} };
  const verification = {
    managerProfile: { verification_status: 'approved' },
    verificationStatus: 'approved', isLoading: false, error: null,
  };
  const boundaries: Record<string, unknown> = {
    'react-router-dom': { useNavigate: () => navigate, useLocation: () => location },
    '@/contexts/ToastContext': { useToast: () => toast },
    '@/contexts/ManagerVerificationContext': { useManagerVerification: () => verification },
    '@/contexts/WorkspaceSyncContext': {
      useDashboardWorkspaceRefresh: (options: { refresh: () => Promise<void> }) => { refresh = options.refresh; },
    },
    '@/services/analyticsService': { getManagerAnalytics: async () => ({ data: null }), invalidateAnalyticsCache() {} },
    '@/services/fastTrackService': { getFastTrackCases: async () => ({ data: [], error: null }) },
    '@/services/bookingsService': { bookingsService: { getBookings: () => bookings.promise } },
    '@/lib/roleDocsContent': { managerDocs: {} },
    '@/services/userPropertiesService': {
      getUserProperties: (query: PropertyQuery) => {
        if (query.limit === 1) return Promise.resolve(response('live-counter', 0));
        const request = { ...deferred<PropertyResponse>(), query };
        requests.push(request);
        return request.promise;
      },
    },
    '@/components/ui/PaginationBar': { __esModule: true, default: PaginationBar },
    '@/components/dashboard/ManagerPropertyCard': {
      __esModule: true,
      default: ({ property }: { property: { title: string } }) => <article>{property.title}</article>,
    },
  };
  const require = createRequire(import.meta.url);
  const pagePath = resolve(process.cwd(), 'src/pages/manager/dashboard/page.tsx');
  const compiledPage = ts.transpileModule(readFileSync(pagePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true, target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const pageModule = { exports: {} as { default: React.ComponentType } };
  // Execute the unchanged page, replacing only external boundaries and unrelated widgets.
  const load = (id: string): unknown => {
    if (id in boundaries) return boundaries[id];
    if (id.startsWith('@/components/')) return { __esModule: true, default: () => null };
    return require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id);
  };
  new Function('require', 'module', 'exports', compiledPage)(load, pageModule, pageModule.exports);
  const host = browserWindow.document.createElement('div');
  browserWindow.document.body.append(host);
  const root = createRoot(host as unknown as HTMLDivElement);

  const flushDebounce = async () => {
    const callbacks = [...timers.values()];
    timers.clear();
    await act(async () => { callbacks.forEach((callback) => callback()); });
  };
  const selectStatus = async (value: string) => {
    const select = host.querySelector('select[aria-label="Filter properties by status"]');
    assert.ok(select instanceof browserWindow.HTMLSelectElement);
    await act(async () => {
      select.value = value;
      select.dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
  };
  const text = () => host.querySelector('#section-properties')?.textContent || '';
  const cards = () => [...host.querySelectorAll('#section-properties article')].map((card) => card.textContent);
  const restore = async () => {
    await act(async () => { root.unmount(); bookings.complete([]); });
    timers.clear();
    browserWindow.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  };

  try {
    await act(async () => { root.render(<pageModule.exports.default />); });
    await flushDebounce();
    assert.equal(requests.length, 1);
    return { host, requests, bookings, flushDebounce, selectStatus, text, cards, restore, refresh: () => refresh() };
  } catch (error) {
    await restore();
    throw error;
  }
};

test('Dashboard retains the latest filter results when an older request succeeds later', async () => {
  const ui = await installDashboard();
  try {
    await ui.selectStatus('draft');
    await ui.flushDebounce();
    assert.equal(ui.requests[1].query.status, 'draft');
    await act(async () => { ui.requests[1].complete(response('current-draft', 2)); });
    await act(async () => { ui.requests[0].complete(response('stale-all', 19)); });
    assert.match(ui.text(), /Showing 1-2 of 2 properties/);
    assert.deepEqual(ui.cards(), ['current-draft-0', 'current-draft-1']);
    assert.doesNotMatch(ui.text(), /19 properties/);
  } finally { await ui.restore(); }
});

test('Dashboard ignores stale errors after the current filter succeeds', async () => {
  const ui = await installDashboard();
  try {
    await ui.selectStatus('draft');
    await ui.flushDebounce();
    await act(async () => { ui.requests[1].complete(response('current-draft', 2)); });
    await act(async () => {
      ui.requests[0].complete({ data: null, pagination: null, error: { message: 'Stale request failure' } });
    });
    assert.deepEqual(ui.cards(), ['current-draft-0', 'current-draft-1']);
    assert.doesNotMatch(ui.text(), /Stale request failure/);
  } finally { await ui.restore(); }
});

test('Dashboard invalidates a request when filters change before the next debounce fires', async () => {
  const ui = await installDashboard();
  try {
    await ui.selectStatus('draft');
    await act(async () => { ui.requests[0].complete(response('stale-all', 19)); });
    assert.deepEqual(ui.cards(), []);
    assert.doesNotMatch(ui.text(), /19 properties/);
    await ui.flushDebounce();
    await act(async () => { ui.requests[1].complete(response('current-draft', 2)); });
    assert.deepEqual(ui.cards(), ['current-draft-0', 'current-draft-1']);
  } finally { await ui.restore(); }
});

test('stale completion and dashboard metrics cannot clear a newer property loading state', async () => {
  const ui = await installDashboard();
  try {
    await ui.selectStatus('draft');
    await ui.flushDebounce();
    await act(async () => { ui.requests[0].complete(response('stale-all', 19)); ui.bookings.complete([]); });
    assert.deepEqual(ui.cards(), []);
    assert.equal(ui.host.querySelectorAll('#section-properties .animate-pulse').length, 3);
    await act(async () => { ui.requests[1].complete(response('current-draft', 2)); });
    assert.deepEqual(ui.cards(), ['current-draft-0', 'current-draft-1']);
  } finally { await ui.restore(); }
});

test('a current background refresh releases loading and cannot be overwritten by a visible request', async () => {
  const ui = await installDashboard();
  try {
    let refreshing!: Promise<void>;
    await act(async () => { refreshing = ui.refresh(); });
    assert.equal(ui.requests.length, 2);
    await act(async () => { ui.requests[1].complete(response('refreshed', 2)); ui.bookings.complete([]); await refreshing; });
    assert.deepEqual(ui.cards(), ['refreshed-0', 'refreshed-1']);
    await act(async () => { ui.requests[0].complete(response('stale-visible', 19)); });
    assert.deepEqual(ui.cards(), ['refreshed-0', 'refreshed-1']);
  } finally { await ui.restore(); }
});

test('the latest request still displays its own API error', async () => {
  const ui = await installDashboard();
  try {
    await act(async () => {
      ui.requests[0].complete({ data: null, pagination: null, error: { message: 'Current property request failed' } });
    });
    assert.match(ui.text(), /Current property request failed/);
    assert.deepEqual(ui.cards(), []);
  } finally { await ui.restore(); }
});

test('a successful background refresh clears the previous property error', async () => {
  const ui = await installDashboard();
  try {
    await act(async () => {
      ui.requests[0].complete({ data: null, pagination: null, error: { message: 'Temporary property failure' } });
    });
    assert.match(ui.text(), /Temporary property failure/);
    let refreshing!: Promise<void>;
    await act(async () => { refreshing = ui.refresh(); });
    await act(async () => { ui.requests[1].complete(response('recovered', 2)); ui.bookings.complete([]); await refreshing; });
    assert.doesNotMatch(ui.text(), /Temporary property failure/);
    assert.deepEqual(ui.cards(), ['recovered-0', 'recovered-1']);
  } finally { await ui.restore(); }
});

test('dashboard metric completion alone does not dismiss pending property placeholders', async () => {
  const ui = await installDashboard();
  try {
    await act(async () => { ui.bookings.complete([]); });
    assert.equal(ui.host.querySelectorAll('#section-properties .animate-pulse').length, 3);
    assert.doesNotMatch(ui.text(), /No properties found/);
    await act(async () => { ui.requests[0].complete(response('loaded', 2)); });
    assert.deepEqual(ui.cards(), ['loaded-0', 'loaded-1']);
  } finally { await ui.restore(); }
});

test('property pagination still requests and displays the selected page', async () => {
  const ui = await installDashboard();
  try {
    await act(async () => { ui.requests[0].complete(response('first-page', 14)); });
    const nextButton = [...ui.host.querySelectorAll('button')]
      .find((button) => button.closest('#section-properties') && button.textContent?.trim() === 'Next');
    assert.ok(nextButton);
    assert.equal(nextButton.disabled, false);
    await act(async () => { nextButton.click(); });
    await ui.flushDebounce();
    assert.equal(ui.requests[1].query.page, 2);
    assert.equal(nextButton.disabled, true);
    await act(async () => { ui.requests[1].complete(response('second-page', 14, 2)); });
    assert.match(ui.text(), /Showing 7-12 of 14 properties/);
    assert.deepEqual(ui.cards(), Array.from({ length: 6 }, (_, index) => `second-page-${index}`));
    assert.equal(nextButton.disabled, false);
  } finally { await ui.restore(); }
});
