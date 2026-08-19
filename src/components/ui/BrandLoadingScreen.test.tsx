import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import BrandLoadingScreen from './BrandLoadingScreen';

test('brand loading screen presents the Estospaces identity and an accessible status', () => {
    const markup = renderToStaticMarkup(<BrandLoadingScreen label="Loading your dashboard..." />);

    assert.match(markup, /role="status"/);
    assert.match(markup, /aria-live="polite"/);
    assert.match(markup, /aria-busy="true"/);
    assert.match(markup, /src="\/logo-icon\.png"/);
    assert.match(markup, />Estospaces</);
    assert.match(markup, /Loading your dashboard\.\.\./);
    assert.match(markup, /min-h-\[100dvh\]/);
});

test('section variant keeps the branded loader inside an existing workspace shell', () => {
    const markup = renderToStaticMarkup(<BrandLoadingScreen variant="section" />);

    assert.match(markup, /min-h-\[18rem\]/);
    assert.doesNotMatch(markup, /min-h-\[100dvh\]/);
});

test('global route and role session gates share the branded loading screen', () => {
    const sourceFiles = [
        'src/App.tsx',
        'src/components/routing/RouteAccessBoundary.tsx',
        'src/components/routing/StartupRedirect.tsx',
        'src/components/layout/UserLayoutClient.tsx',
        'src/components/layout/ManagerLayoutClient.tsx',
        'src/components/layout/AdminLayoutClient.tsx',
        'src/pages/manager/user-verifications/page.tsx',
    ];

    for (const file of sourceFiles) {
        const source = readFileSync(resolve(process.cwd(), file), 'utf8');
        assert.match(source, /BrandLoadingScreen/, `${file} must use the shared branded loader`);
    }
});

test('brand loader motion has a reduced-motion fallback', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

    assert.match(styles, /@keyframes estospaces-loading-progress/);
    assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(styles, /\.brand-loading-progress/);
});
