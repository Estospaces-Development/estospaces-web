import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

test('recent lead activity opens the supported leads workspace with an exact lead search', () => {
    const activitySource = readFileSync(
        resolve(process.cwd(), 'src/components/dashboard/RecentActivity.tsx'),
        'utf8',
    );
    const leadsSource = readFileSync(
        resolve(process.cwd(), 'src/pages/manager/leads/page.tsx'),
        'utf8',
    );

    assert.match(activitySource, /`\/manager\/leads\?search=\$\{encodeURIComponent\(activity\.leadId\)\}`/);
    assert.doesNotMatch(activitySource, /`\/manager\/leads\/\$\{activity\.leadId\}`/);
    assert.match(leadsSource, /const searchParamQuery = searchParams\.get\('search'\) \|\| '';/);
    assert.match(leadsSource, /const haystack = \[\s*lead\.id,/);
});
