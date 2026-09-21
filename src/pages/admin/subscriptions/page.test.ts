import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import AppProviders from '@/components/providers/AppProviders';
import { AuthProvider } from '@/contexts/AuthContext';
import { getCatalogReadState } from './page';

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
