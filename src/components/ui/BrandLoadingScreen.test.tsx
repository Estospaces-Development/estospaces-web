import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { Window } from 'happy-dom';

import BrandLoadingScreen from './BrandLoadingScreen';

test('brand loading screen presents the Estospaces identity and an accessible status', () => {
    const markup = renderToStaticMarkup(<BrandLoadingScreen label="Loading your dashboard..." />);

    assert.match(markup, /role="status"/);
    assert.match(markup, /aria-live="polite"/);
    assert.match(markup, /aria-busy="true"/);
    assert.match(markup, /src="\/logo-icon\.png"/);
    assert.match(markup, /Loading your dashboard\.\.\./);
    assert.match(markup, /fixed inset-0/);
    assert.match(markup, /z-\[9999\]/);
    assert.match(markup, /h-\[100dvh\]/);
    assert.match(markup, /min-h-\[100dvh\]/);
    assert.match(markup, /w-screen/);
    assert.match(markup, /size-36/);
    assert.match(markup, /sm:size-40/);
    assert.match(markup, /data-loading-variant="screen"/);
    assert.match(markup, /data-loading-layer="global"/);
    assert.match(markup, /brand-loading-spinner-ring/);
    assert.match(markup, /class="sr-only"/);
    assert.doesNotMatch(markup, /brand-loading-stage/);
    assert.doesNotMatch(markup, /brand-loading-wordmark/);
    assert.doesNotMatch(markup, /brand-loading-progress/);
});

test('section variant keeps the branded loader inside an existing workspace shell', () => {
    const markup = renderToStaticMarkup(<BrandLoadingScreen variant="section" />);

    assert.match(markup, /min-h-\[18rem\]/);
    assert.match(markup, /sm:min-h-\[22rem\]/);
    assert.match(markup, /size-28/);
    assert.match(markup, /sm:size-32/);
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
    assert.match(markup, /data-loading-layer="inline"/);
    assert.match(markup, /size-20/);
    assert.match(markup, /sm:size-24/);
    assert.doesNotMatch(markup, /min-h-\[100dvh\]/);
    assert.doesNotMatch(markup, /fixed inset-0/);
});

test('all loading surfaces use the same theme-aware circular spinner treatment', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

    assert.match(styles, /\.brand-loading-surface\s*\{[\s\S]*--loading-surface:/);
    assert.match(styles, /\.dark \.brand-loading-surface/);
    assert.match(styles, /\.brand-loading-spinner-track\s*\{/);
    assert.match(styles, /\.brand-loading-spinner-ring\s*\{[\s\S]*conic-gradient/);
    assert.match(styles, /\.brand-loading-logo\s*\{/);
    assert.match(styles, /\.brand-loading-surface\[data-loading-variant='screen'\]\s*\{[\s\S]*pointer-events: auto/);
});

test('screen loader escapes dashboard stacking contexts through a body portal', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/ui/BrandLoadingScreen.tsx'), 'utf8');

    assert.match(source, /import \{ createPortal \} from 'react-dom'/);
    assert.match(source, /variant === 'screen' && typeof document !== 'undefined'/);
    assert.match(source, /createPortal\(loadingSurface, document\.body\)/);
});

test('screen loader mounts outside the dashboard shell at runtime', () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/user/dashboard' });
    const globals = globalThis as typeof globalThis & Record<string, unknown>;
    const globalKeys = ['window', 'document', 'HTMLElement', 'Node', 'IS_REACT_ACT_ENVIRONMENT'] as const;
    const previousDescriptors = new Map(
        globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
    );
    const browserGlobals: Record<string, unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        HTMLElement: browserWindow.HTMLElement,
        Node: browserWindow.Node,
        IS_REACT_ACT_ENVIRONMENT: true,
    };

    Object.entries(browserGlobals).forEach(([key, value]) => {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    });

    const dashboardShell = browserWindow.document.createElement('div');
    const routeHost = browserWindow.document.createElement('div');
    dashboardShell.append(routeHost);
    browserWindow.document.body.append(dashboardShell);
    const root = createRoot(routeHost as unknown as HTMLDivElement);

    try {
        act(() => {
            root.render(<BrandLoadingScreen label="Opening your dashboard..." />);
        });
        const loader = browserWindow.document.querySelector('[data-loading-layer="global"]');
        assert.ok(loader, 'global loader should render');
        assert.equal(loader.parentElement, browserWindow.document.body);
        assert.equal(dashboardShell.contains(loader), false);
    } finally {
        act(() => {
            root.unmount();
        });
        browserWindow.close();
        previousDescriptors.forEach((descriptor, key) => {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globals[key];
        });
    }
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

test('registration and email verification actions use the global loader instead of button logos', () => {
    for (const file of [
        'src/pages/auth/register/page.tsx',
        'src/pages/auth/verify-email/page.tsx',
    ]) {
        const source = readFileSync(resolve(process.cwd(), file), 'utf8');
        assert.match(source, /BrandLoadingScreen/);
        assert.doesNotMatch(source, /BrandLoader/);
    }
});

test('observational research uses the branded section loader for its initial data request', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/admin/research/page.tsx'), 'utf8');

    assert.match(source, /if \(loading\) \{[\s\S]*BrandLoadingScreen variant="section" label="Loading observational research\.\.\." \/>/);
    assert.doesNotMatch(source, /Loader2[^\n]*Loading observational research/);
});

test('brand loader motion has a reduced-motion fallback', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

    assert.match(styles, /@keyframes estospaces-loader-breathe/);
    assert.match(styles, /@keyframes estospaces-loader-glow/);
    assert.match(styles, /@keyframes estospaces-loader-orbit/);
    assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(styles, /\.brand-loading-spinner-ring/);
});
