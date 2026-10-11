import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manager = readFileSync(new URL('./ApplicationDetail.tsx', import.meta.url), 'utf8');
const user = readFileSync(new URL('../../dashboard/applications/ApplicationDetail.tsx', import.meta.url), 'utf8');

const withdrawnEntry = (source: string) => {
    const start = source.indexOf('application.status === APPLICATION_STATUS.WITHDRAWN');
    assert.ok(start >= 0, 'withdrawn timeline entry not found');
    return source.slice(start, source.indexOf('});', start));
};

// booking#111: a withdrawal may come from a cancelled case or a sale to another buyer, and the
// server's journey_status_reason says which. The manager never withdrew the application themselves.
test('the withdrawn timeline entry shows the server reason, with a role-correct fallback', () => {
    const managerEntry = withdrawnEntry(manager);
    assert.match(managerEntry, /application\.journeyStatusReason \|\| "The applicant withdrew this application"/);
    assert.ok(!managerEntry.includes('You withdrew this application'));
    assert.match(withdrawnEntry(user), /application\.journeyStatusReason \|\| 'You withdrew this application'/);
});
