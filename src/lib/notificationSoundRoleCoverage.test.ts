import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (relativePath: string) => readFileSync(
    new URL(relativePath, import.meta.url),
    'utf8',
);

test('user, manager, and admin application shells use the shared notification provider', () => {
    [
        '../components/layout/UserLayoutClient.tsx',
        '../components/layout/ManagerLayoutClient.tsx',
        '../components/layout/AdminLayoutClient.tsx',
    ].forEach((relativePath) => {
        const source = readSource(relativePath);
        assert.match(source, /import \{ NotificationsProvider \}/);
        assert.match(source, /<NotificationsProvider>/);
    });
});

test('the shared provider plays one important-notification sound per polling batch', () => {
    const source = readSource('../contexts/NotificationsContext.tsx');

    assert.match(source, /buildNotificationAlertBatch\(/);
    assert.match(source, /visibleFreshNotifications\.forEach/);
    assert.match(source, /if \(hasImportantNotification\(freshNotifications\)\)/);
    assert.match(source, /playImportantNotificationSound\(\)/);
    assert.doesNotMatch(source, /freshNotifications\.forEach[\s\S]*playImportantNotificationSound\(\)[\s\S]*showBrowserNotification/);
});
