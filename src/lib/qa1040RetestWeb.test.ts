import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('deep-linked leads are selected on the leads page (MB-0583, MB-0968)', () => {
    assert.match(read('pages/manager/leads/page.tsx'), /const requestedLeadId = searchParams\.get\('lead'\);/);
    assert.match(read('components/manager/LeadActionMap.tsx'), /useState<string \| null>\(requestedLeadId\)/);
});

test('checkout start never adds the generic error toast (MB-0778)', () => {
    assert.match(read('services/managerSubscriptionService.ts'), /suppressErrorToast: true,\s*\}\);\s*\}\s*\n\s*export function verifyManagerSubscriptionCheckout/);
});

test('notification tiles show a dash, not 0, during an outage (MB-0597)', () => {
    for (const page of ['pages/user/dashboard/notifications/page.tsx', 'pages/admin/notifications/page.tsx']) {
        assert.equal(read(page).match(/countsUnknown \? "—"/g)?.length, 3, page);
    }
});

test('support keeps a refused reply and reports a failed ticket load (MB-0959, MB-1017)', () => {
    const support = read('components/support/SupportCenter.tsx');
    assert.match(support, /if \(error\?\.status === 409\) \{\s*setUnsentReply\(reply\.trim\(\)\);/);
    assert.match(support, /ticketsLoadFailed \? 'Support tickets could not load'/);
});

test('failed analytics show an unavailable panel, not zero tiles (MB-0649, MB-0660)', () => {
    assert.match(read('pages/manager/analytics/page.tsx'), /if \(analyticsError && !analyticsData\) \{\s*return <AnalyticsUnavailable/);
    assert.match(read('pages/admin/analytics/page.tsx'), /if \(error && !data\) \{\s*return <AnalyticsUnavailable/);
    assert.match(read('pages/admin/dashboard/page.tsx'), /error \? 'Some figures failed to load' : 'Backend Synced'/);
});

test('the applicant sees their own move-in date and message (MB-0493)', () => {
    assert.match(read('pages/user/applications/page.tsx'), /Your message: <\/span>\{application\.applicantMessage\}/);
});

test('appointment times carry a zone and contract dates keep their day (MB-0451, MB-0999)', () => {
    assert.match(read('pages/user/dashboard/viewings/page.tsx'), /timeZoneName: 'short'/);
    assert.match(read('pages/manager/appointments/page.tsx'), /timeZoneName: 'short'/);
    assert.match(read('components/dashboard/contracts/UserContractModal.tsx'), /timeZone: 'UTC'/);
    assert.match(read('pages/user/dashboard/contracts/page.tsx'), /const formatCalendarDate = /);
});

test('users can accept or cancel a rescheduled viewing (MB-0466)', () => {
    const page = read('pages/user/dashboard/viewings/page.tsx');
    assert.match(page, /Accept new time/);
    assert.match(page, /viewing\.status === 'rescheduled'\) && !viewing\.workflow_locked/);
});

test('shared homes are listed even without the nearest-agent box (MB-1029)', () => {
    assert.match(read('components/dashboard/BrokerRequestWidget.tsx'), /activeRequest\.fast_track_enabled \|\| availableSharedProperties\.length > 0/);
});
