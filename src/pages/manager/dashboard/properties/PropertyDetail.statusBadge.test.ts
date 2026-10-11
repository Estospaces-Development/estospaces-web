import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

import { getManagerPropertyStatusBadge } from '@/lib/propertyStatusBadge';

const source = readFileSync(resolve(process.cwd(), 'src/pages/manager/dashboard/properties/[id]/page.tsx'), 'utf8');

test('manager property detail shows the same status badge as the list, not its own copy (#689)', () => {
    assert.doesNotMatch(source, /const getStatusColor\b/);
    assert.doesNotMatch(source, /const formatStatus\b/);
    assert.match(source, /getManagerPropertyStatusBadge\(property\.status\)/);
    assert.match(source, /statusBadge\.label/);
    assert.match(source, /statusBadge\.badgeClassName/);
});

test('the shared badge gives pending approval the list label and an amber, not green, colour (#689)', () => {
    const badge = getManagerPropertyStatusBadge('pending_approval');
    assert.equal(badge.label, 'Admin Approval Pending');
    assert.match(badge.badgeClassName, /amber/);
    assert.doesNotMatch(badge.badgeClassName, /green|emerald/);
});
