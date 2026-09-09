import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = readFileSync(resolve(process.cwd(), 'src/pages/user/dashboard/discover/page.tsx'), 'utf8');
const section = source.match(/<section\s+aria-labelledby="discover-results-heading"[\s\S]*?<\/section>/)?.[0];
assert.ok(section, 'Render the real discovery result-summary markup');
const compiled = ts.transpileModule(
    `const render = (loading, error, total, paginatedProperties, viewMode) => (${section});`,
    { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } },
).outputText;
const render = new Function('React', `${compiled}\nreturn render;`)(React) as (
    loading: boolean, error: string | null, total: number, properties: unknown[], mode: string,
) => React.ReactElement;
const summary = (loading: boolean, error: string | null, total = 0, shown = 0, mode = 'grid') =>
    renderToStaticMarkup(render(loading, error, total, Array.from({ length: shown }), mode));

for (const [name, total, shown] of [['initial load', 0, 0], ['filter refresh', 53, 12]] as const) {
    test(`discovery summary reports loading, not an empty or stale result, during ${name}`, () => {
        const html = summary(true, null, total, shown);
        assert.match(html, /Loading homes/);
        assert.match(html, /aria-busy="true"/);
        assert.doesNotMatch(html, /homes? found|Adjust your search|Showing \d/);
    });
}

test('failed discovery does not claim a successful empty result or expose server details', () => {
    const html = summary(false, 'private database connection detail');
    assert.match(html, /Homes unavailable/);
    assert.doesNotMatch(html, /homes? found|Adjust your search|private database/);
});

test('retry loading takes precedence over an earlier error', () => {
    const html = summary(true, 'previous error');
    assert.match(html, /Loading homes/);
    assert.doesNotMatch(html, /Homes unavailable|previous error/);
});

test('successful empty discovery keeps the accurate count and filter guidance', () => {
    const html = summary(false, null);
    assert.match(html, /0 homes found/);
    assert.match(html, /Adjust your search/);
    assert.doesNotMatch(html, /Loading homes|Homes unavailable/);
});

test('successful discovery preserves singular, plural, page counts and view labels', () => {
    assert.match(summary(false, null, 1, 1), /1 home found/);
    assert.match(summary(false, null, 53, 12), /53 homes found/);
    assert.match(summary(false, null, 53, 12), /Showing 12 on this page in card view/);
    assert.match(summary(false, null, 53, 12, 'map'), /Showing 12 on this page in map view/);
});
