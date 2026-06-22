import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const adminDashboardSource = readFileSync(
    resolve(process.cwd(), 'src/pages/admin/dashboard/page.tsx'),
    'utf8',
);

test('admin dashboard recent notifications use the shared notification visual helper', () => {
    const notificationIconBlock = adminDashboardSource.slice(
        adminDashboardSource.indexOf('const getNotificationIcon'),
        adminDashboardSource.indexOf('export default function AdminDashboard'),
    );

    assert.match(adminDashboardSource, /getNotificationIconColorClass/);
    assert.match(adminDashboardSource, /getNotificationTone/);
    assert.doesNotMatch(notificationIconBlock, /className="text-(blue|gray|orange|purple)-500"/);
});
