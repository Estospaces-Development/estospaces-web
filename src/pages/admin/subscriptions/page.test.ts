import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryObserver, useQueryClient } from '@tanstack/react-query';

import AppProviders from '@/components/providers/AppProviders';
import { AuthProvider } from '@/contexts/AuthContext';
import { promotionQueryKeys } from './AdminPromotionsSection';
import { getCatalogReadState, queryKeys, refreshAdminSubscriptionData } from './page';

const pageDirectory = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(pageDirectory, '../../..');
const source = (relativePath: string) => readFileSync(path.join(srcRoot, relativePath), 'utf8');

test('admin subscription route is discoverable from the admin shell', () => {
    assert.match(source('App.tsx'), /pages\/admin\/subscriptions\/page/);
    assert.match(source('App.tsx'), /path="subscriptions"/);
    assert.match(source('components/layout/AdminSidebar.tsx'), /label: 'Subscriptions', path: '\/admin\/subscriptions'/);
    assert.match(source('components/layout/AdminHeader.tsx'), /label: 'Subscriptions', path: '\/admin\/subscriptions'/);
});

test('admin subscription queries run inside the application query client', () => {
    const main = source('main.tsx');
    const QueryClientConsumer = () => createElement('span', null, useQueryClient() ? 'query-client-ready' : 'missing-query-client');
    const rendered = renderToStaticMarkup(
        createElement(
            MemoryRouter,
            null,
            createElement(AuthProvider, null, createElement(AppProviders, null, createElement(QueryClientConsumer))),
        ),
    );
    assert.match(rendered, /query-client-ready/);
    assert.match(main, /<AppProviders>[\s\S]*<App \/>[\s\S]*<\/AppProviders>/);
});

test('admin reviews the immutable catalog record before it can approve a plan', () => {
    const page = source('pages/admin/subscriptions/page.tsx');
    for (const field of ['provider_plan_id', 'total_cycles', 'tax_minor', 'image_upload_limit_bytes', 'lead_delivery_policy', 'terms_text', 'terms_digest']) {
        assert.match(page, new RegExp(`plan\\.${field}`));
    }
    assert.match(page, /approveAdminSubscriptionPlan\(plan\.id, plan\.terms_digest\)/);
});

test('catalog mutation remains disabled when the authoritative plan list is unavailable', () => {
    const page = source('pages/admin/subscriptions/page.tsx');
    assert.match(page, /const catalogReady = plans\.isSuccess/);
    assert.match(page, /disabled=\{busy !== null \|\| !catalogReady\}/);
    assert.match(page, /Unable to load the subscription catalog/);
});

test('a paused initial catalog request is treated as loading instead of an empty catalog', () => {
    assert.equal(getCatalogReadState(false, false), 'loading');
    assert.equal(getCatalogReadState(false, true), 'error');
    assert.equal(getCatalogReadState(true, false), 'ready');
});

test('percent-discount Activate goes through the Razorpay offer checklist; trials activate directly', () => {
    const section = source('pages/admin/subscriptions/AdminPromotionsSection.tsx');
    assert.match(section, /action === 'activate' && promotion\.kind === 'percent_discount'\s*\? <button[^\n]*setOfferCheck\(/);
    assert.match(section, /<button type="button" disabled=\{!complete \|\| busy !== null\}[^\n]*onClick=\{onActivate\}/);
    assert.match(section, /\{OFFER_CHECKLIST_EXPLANATION\}/);
    assert.match(section, /onActivate=\{async \(\) => \{ if \(await changeStatus\(promotion, 'activate'\)\) setOfferCheck\(null\); \}\}/);
    // The checklist is bound to one promotion version, so an edit resets it.
    assert.match(section, /key: `\$\{promotion\.id\}:\$\{promotion\.version\}`, ticked: \[\]/);
});

const waitForIdle = async (client: QueryClient) => {
    while (client.isFetching() > 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
};

const observeSections = (client: QueryClient, failingKey?: string) => {
    const calls = new Map<string, number>();
    const loader = (name: string) => async () => {
        const count = (calls.get(name) ?? 0) + 1;
        calls.set(name, count);
        if (name === failingKey && count > 1) throw new Error(`${name} unavailable`);
        return [name];
    };
    const sections = {
        plans: queryKeys.plans(),
        coupons: queryKeys.coupons(),
        grants: queryKeys.grants(),
        promotions: promotionQueryKeys.list(),
    };
    const unsubscribers = Object.entries(sections).map(([name, queryKey]) =>
        new QueryObserver(client, { queryKey, queryFn: loader(name) }).subscribe(() => undefined));
    // A trial lookup that has not been opened must not be fetched by Refresh.
    unsubscribers.push(new QueryObserver(client, { queryKey: promotionQueryKeys.trialGrants(''), queryFn: loader('trial-grants'), enabled: false }).subscribe(() => undefined));
    return { calls, unsubscribe: () => unsubscribers.forEach((unsubscribe) => unsubscribe()) };
};

test('Refresh refetches the catalog, promotions and launch campaign, coupons and pilot requests', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { calls, unsubscribe } = observeSections(client);
    await waitForIdle(client);
    assert.deepEqual(Object.fromEntries(calls), { plans: 1, coupons: 1, grants: 1, promotions: 1 });

    await refreshAdminSubscriptionData(client);

    assert.deepEqual(Object.fromEntries(calls), { plans: 2, coupons: 2, grants: 2, promotions: 2 });

    // A refresh that overlaps an in-flight reload joins it instead of cancelling it.
    const inFlight = client.invalidateQueries({ queryKey: queryKeys.all });
    await refreshAdminSubscriptionData(client);
    await inFlight;
    assert.deepEqual(Object.fromEntries(calls), { plans: 3, coupons: 3, grants: 3, promotions: 3 });
    unsubscribe();
    client.clear();
});

test('Refresh rejects when any section fails to reload so the admin is told', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unsubscribe } = observeSections(client, 'promotions');
    await waitForIdle(client);

    await assert.rejects(refreshAdminSubscriptionData(client), /promotions unavailable/);
    unsubscribe();
    client.clear();
});

test('Refresh button shows a pending state and reports the result', () => {
    const page = source('pages/admin/subscriptions/page.tsx');
    assert.match(page, /disabled=\{refreshing \|\| busy !== null\} aria-busy=\{refreshing\} onClick=\{\(\) => void refreshAll\(\)\}/);
    assert.match(page, /\{refreshing \? <ActionSpinner size="sm" aria-hidden \/> : <RefreshCw/);
    assert.match(page, /refreshing \? 'Refreshing…' : 'Refresh'/);
    assert.match(page, /await refreshAdminSubscriptionData\(queryClient\);\s*setRefreshedAt\(.+\);\s*toast\.success\('Subscription data refreshed\.'\)/);
    assert.match(page, /toast\.error\('Some subscription data could not be refreshed/);
    assert.match(page, /role="status" aria-live="polite"[^>]*>\{refreshedAt \? `Updated \$\{refreshedAt\}` : ''\}/);
});

test('Refresh button and immutable terms expander have dark-mode colours', () => {
    const page = source('pages/admin/subscriptions/page.tsx');
    const refreshButton = page.match(/<button[^>]*onClick=\{\(\) => void refreshAll\(\)\} className="([^"]*)"/)?.[1] ?? '';
    for (const token of ['text-gray-900', 'border-gray-300', 'bg-white', 'dark:text-gray-100', 'dark:border-gray-600', 'dark:bg-gray-900']) {
        assert.ok(refreshButton.split(' ').includes(token), `Refresh button is missing ${token}`);
    }
    assert.match(page, /<summary className="[^"]*\bdark:text-gray-100\b[^"]*">Review complete immutable terms before approval<\/summary>/);
    assert.match(page, /<details className="[^"]*\bdark:bg-gray-950\b[^"]*\bdark:text-gray-100\b[^"]*">/);
    assert.match(page, /<p className="[^"]*whitespace-pre-wrap[^"]*\bdark:border-gray-700 dark:bg-gray-900 dark:text-gray-200\b[^"]*">\{plan\.terms_text\}<\/p>/);
    // Text without its own colour inherits the dark-grey html colour unless the page sets one.
    assert.match(page, /return <div className="[^"]*\bdark:text-gray-100\b[^"]*">/);
});

test('no light-only text or background colours remain on the subscriptions page', () => {
    const lightOnly = [
        { light: /(?:^|\s)bg-white(?:\s|$)/, dark: /dark:bg-/ },
        { light: /(?:^|\s)text-gray-[5-9]00(?:\s|$)/, dark: /dark:text-/ },
        { light: /(?:^|\s)text-(?:red|orange|green|emerald|amber)-[6-9]00(?:\s|$)/, dark: /dark:text-/ },
    ];
    for (const file of ['pages/admin/subscriptions/page.tsx', 'pages/admin/subscriptions/AdminPromotionsSection.tsx']) {
        const classLists = [...source(file).matchAll(/className="([^"]*)"|= '([^']*min-h-11[^']*)'/g)].map((match) => match[1] ?? match[2]);
        assert.ok(classLists.length > 20, `expected to scan class lists in ${file}`);
        for (const classes of classLists) {
            for (const { light, dark } of lightOnly) {
                if (light.test(classes) && !dark.test(classes) && !/\btext-white\b/.test(classes)) {
                    assert.fail(`${file} has a light-only colour without a dark: variant: "${classes}"`);
                }
            }
        }
    }
});
