import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import DocsMarkdown from '@/components/docs/DocsMarkdown';
import { DELETED_FAST_TRACK_CASE_MESSAGE } from '@/lib/fastTrackCaseContext';
import { getSearchFilterValidationMessage } from '@/lib/propertySearchControls';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const readRepo = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('a foreign Fast Track case link looks exactly like a missing one (MB-0915)', () => {
    const workspace = read('components/fast-track/FastTrackWorkspace.tsx');
    assert.match(workspace, /if \(result\.notFound \|\| result\.forbidden\) \{\s*setRequestedCaseLookup\(\{ caseId: normalizedRequestedCaseParam, status: 'miss' \}\);/);
    assert.doesNotMatch(workspace, /status: 'forbidden'|requestedCaseForbidden|data-fast-track-case-forbidden|You do not have access to this journey/);
});

test('an unknown or invalid ?case= link never claims the case was deleted (MB-0369)', () => {
    assert.equal(DELETED_FAST_TRACK_CASE_MESSAGE, 'This journey link is not available to your account.');
    const workspace = read('components/fast-track/FastTrackWorkspace.tsx');
    assert.match(workspace, /<p className="font-semibold">Journey link unavailable<\/p>/);
    assert.doesNotMatch(workspace, /Journey link recovered/);
});

test('document preview never shows the previous file under the next heading (MB-0403)', () => {
    const workspace = read('components/fast-track/FastTrackWorkspace.tsx');
    const start = workspace.indexOf('const ensureDocumentPreview = useCallback(async (');
    const preview = workspace.slice(start, workspace.indexOf('const handleRailPreview', start));
    assert.ok(start >= 0);
    assert.match(preview, /const previewRequestKey = getFastTrackPreviewSourceKey\(item, Boolean\(selectedFile\)\);/);
    assert.match(preview, /previewRequestKeyRef\.current = previewRequestKey;/);
    const clear = preview.search(/if \(switchingPreviewFile\) \{[^}]*setPreviewUrl\(null\);/);
    const fetch = preview.indexOf('await getDocumentAccessUrl(item.documentRecordId)');
    assert.ok(clear >= 0 && fetch > clear, 'the old preview URL must be cleared before the new access URL is awaited');
    assert.match(
        preview.slice(fetch),
        /^await getDocumentAccessUrl\(item\.documentRecordId\);\s*if \(previewRequestKeyRef\.current !== previewRequestKey\) \{[^}]*return null;/,
        'a late access URL for another file must be dropped',
    );
});

test('login field errors meet AA contrast and are tied to their inputs (MB-0895)', () => {
    const login = read('pages/auth/login/page.tsx');
    for (const field of ['email', 'password']) {
        const error = `${field}Error`;
        assert.ok(login.includes(`aria-invalid={${error} ? true : undefined}`), field);
        assert.ok(login.includes(`aria-describedby={${error} ? '${field}-error' : undefined}`), field);
        assert.ok(login.includes(`<p id="${field}-error" role="alert" className="mt-2 break-words text-xs text-red-700 dark:text-red-400">{${error}}</p>`), field);
    }
    assert.ok(login.includes('text-sm text-red-700 dark:text-red-400">{generalError}</p>'));
    assert.doesNotMatch(login, /text-red-500">\{(email|password)Error\}|text-red-600 dark:text-red-400">\{generalError\}/);
});

test('the verification country select has an accessible name (MB-0897)', () => {
    assert.match(read('components/dashboard/VerificationSection.tsx'), /<select\s+aria-label="Verification country"\s+value=\{activeMarket\}/);
});

test('an inverted price range is reported instead of a silent empty result (MB-0268)', () => {
    const inverted = 'The minimum price is higher than the maximum price. Lower the minimum or raise the maximum.';
    assert.equal(getSearchFilterValidationMessage(new URLSearchParams('minPrice=5000&maxPrice=10')), inverted);
    assert.equal(getSearchFilterValidationMessage(new URLSearchParams('min_price=5000&max_price=10')), inverted);
    assert.equal(
        getSearchFilterValidationMessage(new URLSearchParams('minPrice=5000&maxPrice=10&market=Atlantis')),
        `Some search filters were adjusted: market must be India or England. ${inverted}`,
    );
    assert.equal(getSearchFilterValidationMessage(new URLSearchParams('minPrice=10&maxPrice=5000')), null);
    assert.equal(getSearchFilterValidationMessage(new URLSearchParams('minPrice=5000&maxPrice=5000')), null);
    assert.equal(getSearchFilterValidationMessage(new URLSearchParams('minPrice=5000')), null);
});

test('a guest search outage hides result counts and offers a retry (MB-0279)', () => {
    const search = read('pages/user/search/page.tsx');
    assert.match(search, /: error \? 'Search results could not load\.' : `\$\{properties\.length\} search results shown\.`/);
    assert.match(search, /\{!error && \(\s*<p className="text-sm text-gray-600 dark:text-gray-400">\s*<span[^>]*>\{isInitialSearchLoading \? '\.\.\.' : total\}<\/span> properties found/);
    const errorPanel = search.slice(search.indexOf('Search temporarily unavailable'));
    assert.match(errorPanel, /^Search temporarily unavailable<\/h2>[\s\S]*?onClick=\{\(\) => void fetchProperties\(\)\}[\s\S]*?Try again\s*<\/button>/);
});

test('role docs never link to route templates or case pages that need a case link (MB-0615)', () => {
    const html = renderToStaticMarkup(
        createElement(MemoryRouter, null, createElement(DocsMarkdown, {
            content: '[/user/properties/:id](/user/properties/:id) and [/user/dashboard](/user/dashboard)',
        })),
    );
    assert.doesNotMatch(html, /href="\/user\/properties\/:id"/);
    assert.match(html, /<span>\/user\/properties\/:id<\/span>/);
    assert.match(html, /href="\/user\/dashboard"/);

    for (const doc of ['docs/user/USER-DASHBOARD-GUIDE.md', 'docs/manager/MANAGER-DASHBOARD-GUIDE.md']) {
        const markdown = readRepo(doc);
        assert.doesNotMatch(markdown, /\]\(\/[^)]*\/:/, doc);
        assert.doesNotMatch(markdown, /\]\(\/(user\/dashboard\/case-file|manager\/case-files)\)/, doc);
    }
});

test('the user header menu truncates a long single-word name and keeps it in a title (MB-0097)', () => {
    assert.ok(read('components/layout/UserHeader.tsx').includes(
        '<div className="font-semibold text-gray-900 dark:text-gray-100 truncate" title={displayName}>{displayName}</div>',
    ));
});

test('changing the viewings filter or search opens page 1 of the new list (MB-0475)', () => {
    const viewings = read('pages/user/dashboard/viewings/page.tsx');
    assert.doesNotMatch(viewings, /\[filter, focusedViewingId, searchQuery\]/);
    assert.match(viewings, /setFilter\(option\.value\);\s*setCurrentPage\(1\);/);
    assert.match(viewings, /setSearchQuery\(event\.target\.value\);\s*setCurrentPage\(1\);/);
    const clamp = viewings.indexOf('setCurrentPage(viewingPagination.currentPage);');
    const focusReset = viewings.search(/setCurrentPage\(1\);\s*\}, \[focusedViewingId\]\);/);
    assert.ok(clamp >= 0 && focusReset > clamp, 'the focus reset must run after the clamp so it wins');
});
