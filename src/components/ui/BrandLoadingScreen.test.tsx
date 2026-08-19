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
    assert.match(markup, /fixed inset-0/);
    assert.match(markup, /z-\[120\]/);
    assert.match(markup, /h-\[100dvh\]/);
    assert.match(markup, /min-h-\[100dvh\]/);
    assert.match(markup, /w-screen/);
    assert.match(markup, /h-28 w-52/);
    assert.match(markup, /sm:h-32 sm:w-60/);
    assert.match(markup, /data-loading-variant="screen"/);
    assert.match(markup, /brand-loading-ambient/);
    assert.match(markup, /brand-loading-halo/);
});

test('section variant keeps the branded loader inside an existing workspace shell', () => {
    const markup = renderToStaticMarkup(<BrandLoadingScreen variant="section" />);

    assert.match(markup, /min-h-\[18rem\]/);
    assert.match(markup, /sm:min-h-\[22rem\]/);
    assert.match(markup, /h-20 w-40/);
    assert.doesNotMatch(markup, /min-h-\[100dvh\]/);
    assert.doesNotMatch(markup, /fixed inset-0/);
});

test('panel variant preserves nearby content while remaining branded and responsive', () => {
    const markup = renderToStaticMarkup(
        <BrandLoadingScreen variant="panel" label="Loading the map..." description="Property locations will appear here." />,
    );

    assert.match(markup, /min-h-32/);
    assert.match(markup, /Loading the map\.\.\./);
    assert.match(markup, /Property locations will appear here\./);
    assert.match(markup, /data-loading-variant="panel"/);
    assert.match(markup, /h-16 w-32/);
    assert.doesNotMatch(markup, /min-h-\[100dvh\]/);
    assert.doesNotMatch(markup, /fixed inset-0/);
});

test('all loading surfaces use the same theme-aware tokens and indeterminate progress treatment', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

    assert.match(styles, /\.brand-loading-surface\s*\{[\s\S]*--loading-surface:/);
    assert.match(styles, /\.dark \.brand-loading-surface/);
    assert.match(styles, /\.brand-loading-track\s*\{/);
    assert.match(styles, /\.brand-loading-progress\s*\{[\s\S]*linear-gradient/);
    assert.match(styles, /\.brand-loading-surface\[data-loading-variant='screen'\] \.brand-loading-ambient/);
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

test('observational research uses the branded section loader for its initial data request', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/admin/research/page.tsx'), 'utf8');

    assert.match(source, /if \(loading\) \{[\s\S]*BrandLoadingScreen variant="section" label="Loading observational research\.\.\." \/>/);
    assert.doesNotMatch(source, /Loader2[^\n]*Loading observational research/);
});

test('brand loader motion has a reduced-motion fallback', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

    assert.match(styles, /@keyframes estospaces-loading-progress/);
    assert.match(styles, /@keyframes estospaces-loader-breathe/);
    assert.match(styles, /@keyframes estospaces-loader-glow/);
    assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(styles, /\.brand-loading-progress/);
});
