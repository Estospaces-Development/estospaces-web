import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const userLayout = readSource('src/components/layout/UserLayoutClient.tsx');
const userHeader = readSource('src/components/layout/UserHeader.tsx');
const userNavigation = readSource('src/components/layout/HorizontalNavigation.tsx');
const messageFab = readSource('src/components/layout/MessageInboxFab.tsx');
const managerLayout = readSource('src/components/layout/ManagerLayoutClient.tsx');
const adminLayout = readSource('src/components/layout/AdminLayoutClient.tsx');
const globals = readSource('src/globals.css');
const searchPage = readSource('src/pages/user/search/page.tsx');
const documentShell = readSource('index.html');

test('user workspace uses a compact mobile header and thumb-reachable navigation', () => {
    assert.match(userHeader, /grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
    assert.match(userHeader, /aria-label="Search Estospaces pages and activities"/);
    assert.match(userHeader, /aria-haspopup="dialog"/);
    assert.match(userNavigation, /fixed inset-x-0 bottom-0/);
    assert.match(userNavigation, /bottom-0 z-20/);
    assert.doesNotMatch(userNavigation, /bottom-0 z-40/);
    assert.match(userNavigation, /grid grid-cols-4/);
    assert.match(userNavigation, /min-h-12 min-w-0 flex-col/);
    assert.match(userNavigation, /absolute right-1\.5 top-1/);
    assert.match(userNavigation, /UnreadCountBadge count=\{item\.badgeCount \|\| 0\} mobile/);
    assert.match(userLayout, /pb-24[\s\S]*md:pb-0/);
    assert.match(messageFab, /hidden[\s\S]*md:inline-flex/);
    assert.match(userHeader, /NotificationDropdown appearance="brand"/);
    assert.match(userHeader, /h-11 min-w-11/);
    assert.match(userHeader, /aria-label="Account actions"/);
});

test('every signed-in role renders inside the shared responsive workspace contract', () => {
    assert.match(userLayout, /data-workspace-role="user"/);
    assert.match(managerLayout, /data-workspace-role="manager"/);
    assert.match(adminLayout, /data-workspace-role="admin"/);
    assert.match(userLayout, /role-workspace-content/);
    assert.match(managerLayout, /role-workspace-content/);
    assert.match(adminLayout, /role-workspace-content/);
    assert.match(globals, /\.role-workspace-content \{[\s\S]*width: 100%;[\s\S]*min-width: 0;[\s\S]*max-width: 100%;/);
    assert.match(globals, /@media \(max-width: 639px\)[\s\S]*overflow-wrap: break-word;[\s\S]*word-break: normal;[\s\S]*font-size: 16px;/);
    assert.match(globals, /@media \(pointer: coarse\)[\s\S]*\.workspace-chrome[\s\S]*min-height: 44px;/);
    assert.match(documentShell, /content="width=device-width, initial-scale=1\.0"/);
    assert.doesNotMatch(documentShell, /viewport-fit=cover/);
});

test('workspace responsiveness preserves page width caps and the browser safe viewport', () => {
    assert.doesNotMatch(globals, /\.role-workspace-content > \* \{[\s\S]*?max-width:/);
    assert.match(globals, /\.role-workspace-content > \*,[\s\S]*?min-width: 0;/);
    assert.doesNotMatch(globals, /header\.workspace-chrome \{[\s\S]*?safe-area-inset-top/);
});

test('property search composes cleanly at narrow widths without changing desktop density', () => {
    assert.match(searchPage, /px-3[\s\S]*sm:px-6[\s\S]*lg:px-8/);
    assert.match(searchPage, /text-\[clamp\(1\.5rem,6vw,2rem\)\]/);
    assert.doesNotMatch(searchPage, /Estospaces search/);
    assert.match(searchPage, /flex min-w-0 flex-col gap-3 sm:flex-row/);
    assert.match(searchPage, /locationInferenceSuppressedRef\.current = true/);
    assert.match(searchPage, /searchParams\.get\('autoLocation'\) === '0'/);
});
