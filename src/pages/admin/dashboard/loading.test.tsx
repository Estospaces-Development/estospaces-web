import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

const source = readFileSync(resolve(process.cwd(), 'src/pages/admin/dashboard/page.tsx'), 'utf8');

const renderLoader = (label: string) => {
    const elements = source.match(/<BrandLoadingScreen\b[^>]*\/>/g) ?? [];
    const element = elements.find((markup) => markup.includes(`label="${label}"`));
    assert.ok(element, `Render the actual Admin Dashboard loader: ${label}`);
    const compiled = ts.transpileModule(`const render = () => (${element});`, {
        compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const render = new Function('React', 'BrandLoadingScreen', `${compiled}\nreturn render;`)(
        React, BrandLoadingScreen,
    ) as () => React.ReactElement;
    return renderToStaticMarkup(render());
};

test('Admin Home initial loader covers the viewport rather than an 18-rem section', () => {
    const html = renderLoader('Initializing Command Center...');
    assert.match(html, /data-loading-variant="screen"/);
    assert.match(html, /data-loading-layer="global"/);
    assert.match(html, /fixed inset-0/);
    assert.match(html, /h-\[100dvh\]/);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-busy="true"/);
    assert.doesNotMatch(html, /min-h-\[18rem\]/);
});

test('recent notification refresh stays inline without hiding loaded dashboard content', () => {
    const html = renderLoader('Loading recent notifications...');
    assert.match(html, /data-loading-variant="panel"/);
    assert.match(html, /data-loading-layer="inline"/);
    assert.doesNotMatch(html, /fixed inset-0/);
});
