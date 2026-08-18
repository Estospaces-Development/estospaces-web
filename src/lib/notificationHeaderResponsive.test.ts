import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const notificationDropdown = readSource('src/components/dashboard/NotificationDropdown.tsx');
const userHeader = readSource('src/components/layout/UserHeader.tsx');

test('brand header notifications use a calm compact touch target without a competing alert animation', () => {
    assert.match(userHeader, /<NotificationDropdown appearance="brand" \/>/);
    assert.match(notificationDropdown, /inline-flex h-11 w-11 shrink-0/);
    assert.match(notificationDropdown, /border-white\/25 bg-white\/10 text-white/);
    assert.match(notificationDropdown, /Notifications, \$\{unreadCount\} unread/);
    assert.match(notificationDropdown, /unreadCount > 99 \? '99\+' : unreadCount/);
    assert.doesNotMatch(notificationDropdown, /animate-ping/);
});

test('notification panel stays within small viewports and restores anchored desktop placement', () => {
    assert.match(notificationDropdown, /appearance === 'brand'/);
    assert.match(notificationDropdown, /top-\[6\.75rem\] max-h-\[calc\(100dvh-7\.5rem\)\]/);
    assert.match(notificationDropdown, /top-\[4\.75rem\] max-h-\[calc\(100dvh-5\.5rem\)\]/);
    assert.match(notificationDropdown, /flex origin-top-right flex-col overflow-hidden/);
    assert.match(notificationDropdown, /sm:absolute sm:inset-x-auto sm:right-0 sm:top-full/);
    assert.match(notificationDropdown, /sm:w-\[min\(24rem,calc\(100vw-2rem\)\)\]/);
    assert.match(notificationDropdown, /min-h-0 flex-1 overflow-y-auto/);
    assert.match(notificationDropdown, /shrink-0 bg-gray-50\/50 p-3/);
});

test('notification rows expose semantic primary and secondary actions to touch and keyboard users', () => {
    assert.match(notificationDropdown, /type="button"[\s\S]*aria-label=\{`\$\{displayCopy\.title\}/);
    assert.match(notificationDropdown, /h-11 w-11[\s\S]*aria-label="Mark notification as read"/);
    assert.match(notificationDropdown, /h-11 w-11[\s\S]*aria-label="Remove notification"/);
    assert.match(notificationDropdown, /sm:pr-\[6\.5rem\]/);
    assert.match(notificationDropdown, /opacity-100[\s\S]*sm:group-focus-within:opacity-100/);
});

test('profile popup uses ordinary button semantics without advertising an unimplemented menu model', () => {
    assert.doesNotMatch(userHeader, /role="menu(?:item)?"/);
    assert.doesNotMatch(userHeader, /aria-haspopup="menu"/);
});
