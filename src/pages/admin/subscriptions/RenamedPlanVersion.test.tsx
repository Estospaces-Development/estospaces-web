import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ToastProvider } from '@/contexts/ToastContext';
import { TERMS_ALREADY_CURRENT_NOTE, buildRenamedPlanDraft, getRenamedVersionAction } from '@/lib/adminPlanRenamedVersion';
import type { AdminSubscriptionPlan } from '@/services/adminSubscriptionService';
import AdminSubscriptionsPage, { queryKeys } from './page';
import { RenamedVersionButton, RenamedVersionPanel } from './RenamedPlanVersion';

const approved: AdminSubscriptionPlan = {
    id: 'pro-gbp-v2', code: 'pro', version: 2, amount_minor: 4900, tax_minor: 817, currency: 'GBP',
    billing_period: 'monthly', billing_interval: 1, total_cycles: 12, published_property_limit: 8,
    active_case_limit: 10, image_upload_limit_bytes: 52_000_000, support_level: 'standard', featured: false,
    lead_delivery_policy: 'best_effort', tax_inclusive: true, terms_schema_version: 2,
    terms_version: '2026-09-uk-pro-v2', terms_text: 'Pro manager subscription: eight published properties.',
    terms_digest: 'b'.repeat(64), provider_plan_id: 'plan_ProGbp2', approved_at: '2026-09-01T10:00:00Z',
};

const catalog: AdminSubscriptionPlan[] = [
    approved,
    { ...approved, id: 'pro-draft-v3', version: 3, approved_at: undefined },
    { ...approved, id: 'pro-retired-v1', version: 1, currency: 'INR', amount_minor: 99900, tax_minor: 0, retired_at: '2026-09-10T10:00:00Z' },
    { ...approved, id: 'pro-renamed-v4', version: 4, terms_text: 'Estospaces Growth monthly terms.' },
];

const renderPage = (plans: AdminSubscriptionPlan[]) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(queryKeys.plans(), plans);
    try {
        return renderToStaticMarkup(<MemoryRouter><QueryClientProvider client={client}><ToastProvider><AdminSubscriptionsPage /></ToastProvider></QueryClientProvider></MemoryRouter>);
    } finally {
        client.clear();
    }
};

const articleFor = (markup: string, heading: RegExp) => {
    const articles = markup.split('<article').slice(1);
    const match = articles.filter((article) => heading.test(article));
    assert.equal(match.length, 1, `expected one plan row for ${heading}`);
    return match[0];
};

test('Create renamed version appears only on approved, unretired rows with legacy names', () => {
    const markup = renderPage(catalog);
    const eligible = articleFor(markup, /\(pro\) v2/);
    assert.match(eligible, /<button type="button" aria-expanded="false" class="[^"]*">Create renamed version<\/button>/);

    const draft = articleFor(markup, /\(pro\) v3/);
    assert.doesNotMatch(draft, /Create renamed version/);
    assert.match(draft, />Approve<\/button>/);

    const retired = articleFor(markup, /\(pro\) v1/);
    assert.doesNotMatch(retired, /Create renamed version/);
    assert.doesNotMatch(retired, />Retire<\/button>/);

    const renamed = articleFor(markup, /\(pro\) v4/);
    assert.match(renamed, /<button type="button" disabled="" aria-describedby="rename-note-pro-renamed-v4" aria-expanded="false"[^>]*>Create renamed version<\/button>/);
    assert.match(renamed, new RegExp(`<p id="rename-note-pro-renamed-v4"[^>]*>${TERMS_ALREADY_CURRENT_NOTE}</p>`));
    // Approve and Retire stay separate actions.
    assert.match(renamed, />Retire<\/button>/);
    // No confirmation panel is open until the admin asks for one.
    assert.doesNotMatch(markup, /I compared the terms/);
});

test('the existing India draft form is still rendered with its next version', () => {
    const markup = renderPage(catalog);
    assert.match(markup, /Create India plan draft/);
    assert.match(markup, /Draft v5: ₹999/);
    assert.match(markup, />Create immutable draft<\/button>/);
});

test('the rename button is disabled while another action is busy or its panel is open', () => {
    const action = getRenamedVersionAction(approved, catalog);
    const idle = renderToStaticMarkup(<RenamedVersionButton plan={approved} action={action} busy={null} open={false} onOpen={() => {}} />);
    assert.doesNotMatch(idle, /disabled=""/);
    for (const [busy, open] of [['approve:x', false], [null, true]] as const) {
        const markup = renderToStaticMarkup(<RenamedVersionButton plan={approved} action={action} busy={busy} open={open} onOpen={() => {}} />);
        assert.match(markup, /<button type="button" disabled=""/);
    }
});

test('the confirmation panel shows old and new terms and identical commercial fields, and waits for the comparison tick', () => {
    const action = getRenamedVersionAction(approved, catalog);
    assert.equal(action.state, 'enabled');
    if (action.state !== 'enabled') return;
    const draft = buildRenamedPlanDraft(approved, catalog, new Date('2026-10-02T09:00:00Z'));
    const markup = renderToStaticMarkup(<RenamedVersionPanel source={approved} draft={draft} terms={action.terms} busy={null} onCreate={() => {}} onCancel={() => {}} />);

    assert.match(markup, /<del[^>]*>Pro manager subscription<\/del><span>: eight published properties\.<\/span>/);
    assert.match(markup, /<ins[^>]*>Growth manager subscription<\/ins><span>: eight published properties\.<\/span>/);
    assert.match(markup, /Draft v5/);
    assert.match(markup, /2026-10-uk-pro-v5/);
    for (const field of ['code', 'currency', 'amount_minor', 'tax_minor', 'tax_inclusive', 'total_cycles', 'provider_plan_id', 'support_level', 'image_upload_limit_bytes', 'lead_delivery_policy', 'terms_schema_version']) {
        assert.match(markup, new RegExp(`<th scope="row"[^>]*>${field}</th>(?:<td[^>]*>[^<]*</td>){2}<td[^>]*>Identical</td>`), field);
    }
    assert.doesNotMatch(markup, />Different</);
    assert.match(markup, /Every commercial field is identical to approved v2/);
    assert.match(markup, /<input type="checkbox" class="h-4 w-4"\/> I compared the terms/);
    assert.match(markup, /<button type="button" disabled=""[^>]*>Create Draft v5<\/button>/);
});

test('a draft whose commercial fields differ can never be created', () => {
    const action = getRenamedVersionAction(approved, catalog);
    if (action.state !== 'enabled') return assert.fail('expected an enabled action');
    const draft = { ...buildRenamedPlanDraft(approved, catalog, new Date()), amount_minor: 5900 };
    const markup = renderToStaticMarkup(<RenamedVersionPanel source={approved} draft={draft} terms={action.terms} busy={null} onCreate={() => {}} onCancel={() => {}} />);
    assert.match(markup, /amount_minor<\/th>(?:<td[^>]*>[^<]*<\/td>){2}<td[^>]*>Different<\/td>/);
    assert.match(markup, /role="alert"[^>]*>A commercial field differs/);
});

test('Create stays disabled until compared and while busy; creating only makes a draft and refreshes', () => {
    const panel = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'RenamedPlanVersion.tsx'), 'utf8');
    assert.match(panel, /disabled=\{!compared \|\| !identical \|\| busy !== null\} onClick=\{onCreate\}/);
    const page = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'page.tsx'), 'utf8');
    // `run` sets busy, shows the result and refreshes the catalog.
    assert.match(page, /await run\(renameBusyKey\(source\), \(\) => createAdminSubscriptionPlan\(draft\),/);
    assert.match(page, /await action\(\);\s*toast\.success\(success\);\s*await refresh\(\);/);
    assert.doesNotMatch(panel, /approveAdminSubscriptionPlan|retireAdminSubscriptionPlan/);
});

test('the panel warns when the terms also name the other tier by its old name', () => {
    const source = { ...approved, terms_text: 'Pro manager subscription. Upgrade to Estospaces Growth for more.' };
    const action = getRenamedVersionAction(source, [source]);
    if (action.state !== 'enabled') return assert.fail('expected an enabled action');
    const draft = buildRenamedPlanDraft(source, [source], new Date());
    const warned = renderToStaticMarkup(<RenamedVersionPanel source={source} draft={draft} terms={action.terms} busy={null} onCreate={() => {}} onCancel={() => {}} />);
    assert.match(warned, /role="note"[^>]*>The current terms also contain &quot;Estospaces Growth&quot;, which is the other tier&#x27;s old name/);

    const plainAction = getRenamedVersionAction(approved, catalog);
    if (plainAction.state !== 'enabled') return assert.fail('expected an enabled action');
    const plain = renderToStaticMarkup(<RenamedVersionPanel source={approved} draft={buildRenamedPlanDraft(approved, catalog, new Date())} terms={plainAction.terms} busy={null} onCreate={() => {}} onCancel={() => {}} />);
    assert.doesNotMatch(plain, /role="note"/);
});
