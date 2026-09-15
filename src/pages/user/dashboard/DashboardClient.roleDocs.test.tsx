import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const dashboardSource = fs.readFileSync(
    path.join(process.cwd(), 'src/pages/user/dashboard/DashboardClient.tsx'),
    'utf8',
);

test('keeps internal role documentation off the user dashboard', () => {
    assert.match(dashboardSource, /\{user\?\.role === 'admin' && \(\s*<RoleDocsPreviewCard/);
});
