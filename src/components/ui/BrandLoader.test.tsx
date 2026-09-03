import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import BrandLoader from './BrandLoader';

const collectSourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return collectSourceFiles(path);
        if (!entry.name.endsWith('.tsx') || entry.name.includes('.test.')) return [];
        return [path];
    });

test('compact brand loader exposes the same accessible ring-and-logo treatment as the global loader', () => {
    const markup = renderToStaticMarkup(
        <BrandLoader size="sm" className="animate-spin text-white" label="Saving changes" />,
    );

    assert.match(markup, /role="status"/);
    assert.match(markup, /aria-label="Saving changes"/);
    assert.match(markup, /aria-busy="true"/);
    assert.match(markup, /src="\/logo-icon\.png"/);
    assert.match(markup, /width="104" height="55"/);
    assert.match(markup, /brand-loading-spinner-track/);
    assert.match(markup, /brand-loading-spinner-ring/);
    assert.match(markup, /brand-loading-logo/);
    assert.match(markup, /--brand-loader-size:28px/);
    assert.doesNotMatch(markup, /animate-spin/);
    assert.doesNotMatch(markup, /<svg|<circle/);
});

test('compact brand loader can display useful progress copy without duplicating hidden text', () => {
    const markup = renderToStaticMarkup(
        <BrandLoader size="lg" label="Loading property details" showLabel />,
    );

    assert.match(markup, />Loading property details</);
    assert.match(markup, /brand-loader-label/);
    assert.match(markup, /--brand-loader-size:48px/);
});

test('legacy square spinner classes preserve their requested compact ring size', () => {
    const markup = renderToStaticMarkup(
        <BrandLoader className="h-3.5 w-3.5 text-white" label="Sending" />,
    );

    assert.match(markup, /--brand-loader-size:14px/);
    assert.match(markup, /brand-loading-spinner-ring/);
    assert.doesNotMatch(markup, /brand-loading-logo/);
    assert.doesNotMatch(markup, /(?:class="[^"]*)\bh-3\.5\b|(?:class="[^"]*)\bw-3\.5\b/);
    assert.match(markup, /text-white/);
});

test('numeric compact loaders preserve layout without rendering an illegibly small logo', () => {
    const markup = renderToStaticMarkup(<BrandLoader size={12} label="Loading contract" />);

    assert.match(markup, /--brand-loader-size:12px/);
    assert.match(markup, /brand-loading-spinner-ring/);
    assert.doesNotMatch(markup, /brand-loading-logo/);
});

test('the logo asset is preloaded before the application renders a cold-start loader', () => {
    const documentSource = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    assert.match(
        documentSource,
        /<link rel="preload" as="image" href="\/logo-icon\.png" fetchpriority="high" \/>/,
    );
});

const findBrandedButtonLoaders = (file: string) => {
    const source = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const violations: string[] = [];

    const readTag = (node: ts.Node) => {
        if (ts.isJsxElement(node)) return node.openingElement.tagName.getText(sourceFile);
        if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText(sourceFile);
        return '';
    };

    const visit = (node: ts.Node) => {
        if (readTag(node) === 'BrandLoader') {
            let ancestor = node.parent;
            while (ancestor) {
                const ancestorTag = readTag(ancestor);
                const actionTag = ancestorTag.toLowerCase();
                if (ancestorTag && (
                    actionTag === 'button'
                    || actionTag === 'label'
                    || actionTag === 'a'
                    || /Button$/.test(ancestorTag)
                )) {
                    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                    violations.push(`${file}:${position.line + 1}`);
                    break;
                }
                ancestor = ancestor.parent;
            }
        }
        ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return violations;
};

test('buttons use neutral action spinners while page and section loading stays branded', () => {
    const files = collectSourceFiles(resolve(process.cwd(), 'src'));
    const violations = files.flatMap(findBrandedButtonLoaders);
    const combinedSource = files
        .filter((file) => !file.endsWith('BrandLoader.tsx') && !file.endsWith('ActionSpinner.tsx'))
        .map((file) => readFileSync(file, 'utf8'))
        .join('\n');

    assert.deepEqual(violations, [], `BrandLoader must not appear inside action controls:\n${violations.join('\n')}`);
    assert.doesNotMatch(combinedSource, /\bLoader2\b/);
    assert.doesNotMatch(combinedSource, /<Loader\b/);
    assert.doesNotMatch(combinedSource, /animate-spin/);
    assert.doesNotMatch(combinedSource, /rounded-full[^\n]*(?:border-b|border-t)[^\n]*(?:loading|spin)/i);

    for (const file of [
        'src/pages/auth/login/page.tsx',
        'src/pages/user/dashboard/DashboardClient.tsx',
        'src/pages/manager/dashboard/page.tsx',
        'src/pages/admin/research/page.tsx',
        'src/components/fast-track/FastTrackWorkspace.tsx',
        'src/components/dashboard/messaging/ConversationThread.tsx',
    ]) {
        const source = readFileSync(resolve(process.cwd(), file), 'utf8');
        assert.match(source, /BrandLoader|BrandLoadingScreen/, `${file} must use an Estospaces loading primitive`);
    }

    const actionSpinnerSource = readFileSync(resolve(process.cwd(), 'src/components/ui/ActionSpinner.tsx'), 'utf8');
    assert.match(actionSpinnerSource, /animate-spin/);
    assert.doesNotMatch(actionSpinnerSource, /logo-icon|<img/);
});

test('production content loading uses the shared screen contract instead of compact branded loaders', () => {
    const files = collectSourceFiles(resolve(process.cwd(), 'src'))
        .filter((file) => !file.endsWith('BrandLoader.tsx') && !file.endsWith('Spinner.tsx'));
    const violations = files.flatMap((file) => {
        const source = readFileSync(file, 'utf8');
        return source.includes('<BrandLoader') ? [file] : [];
    });

    assert.deepEqual(
        violations,
        [],
        `Content loading must use BrandLoadingScreen and micro-actions must use ActionSpinner:\n${violations.join('\n')}`,
    );
});

test('Fast Track has one initial workspace loader and a non-blocking refresh indicator', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/components/fast-track/FastTrackWorkspace.tsx'),
        'utf8',
    );

    assert.match(source, /if \(loading && cases\.length === 0\) \{[\s\S]*BrandLoadingScreen/);
    assert.match(source, /loading && cases\.length > 0/);
    assert.doesNotMatch(source, /<BrandLoader/);
});

test('compact loader inherits the surrounding theme and foreground instead of forcing a one-off color', () => {
    const markup = renderToStaticMarkup(
        <div className="dark text-orange-100">
            <BrandLoader label="Loading manager activity" showLabel />
        </div>,
    );

    assert.match(markup, /class="dark text-orange-100"/);
    assert.match(markup, /brand-loader-label/);
    assert.doesNotMatch(markup, /text-(?:black|zinc-950|white)"/);
});

test('compact and global loaders share the same theme-aware ring tokens', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

    assert.match(styles, /\.brand-loading-surface,\s*\.brand-loader\s*\{[\s\S]*?--loading-ring-start:/);
    assert.match(styles, /\.dark \.brand-loader/);
    assert.match(styles, /\.brand-loader-indicator \.brand-loading-spinner-ring/);
});
