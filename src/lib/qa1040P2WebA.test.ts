import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the lazy-route reload guard is cleared only after a chunk loads, never on App mount (MB-1009, MB-0933)', () => {
    const app = read('App.tsx');
    assert.match(app, /const page = await importer\(\);\s*\/\/[^\n]*\n[^\n]*\n\s*if \(typeof window !== 'undefined'\) \{\s*window\.sessionStorage\.removeItem\(CHUNK_RELOAD_KEY\);/);
    assert.doesNotMatch(app, /const App: React\.FC = \(\) => \{\s*React\.useEffect/);
});

test('a failed notifications load is shown as an error with Retry, not "All clear" (MB-0597)', () => {
    assert.match(read('contexts/NotificationsContext.tsx'), /setLoadError\('Notifications could not be loaded/);
    for (const page of ['pages/user/dashboard/notifications/page.tsx', 'pages/manager/notifications/page.tsx', 'pages/admin/notifications/page.tsx']) {
        assert.match(read(page), /loadError \? 'Notifications could not load'/, page);
        assert.match(read(page), /onClick=\{\(\) => void fetchNotifications\(\)\}/, page);
    }
});

test('a failed conversation load is shown as an error, not "No messages yet" (MB-1017)', () => {
    assert.match(read('contexts/MessagesContext.tsx'), /setConversationsLoadFailed\(true\)/);
    assert.match(read('components/dashboard/messaging/ConversationList.tsx'), /conversationsLoadFailed \? "Messages could not load"/);
});

test('the user dashboard reports a journey load failure instead of a fresh start (MB-0921)', () => {
    const source = read('pages/user/dashboard/DashboardClient.tsx');
    assert.match(source, /if \(brokerResult\.error \|\| fastTrackResult\.error\) \{\s*setJourneySummaryError/);
    assert.match(source, /if \(journeySummaryError\) \{\s*return \{\s*title: 'Your journey could not load'/);
});

test('manager analytics shows load failures and no failing SLA verdict without leads (MB-0649, MB-0646)', () => {
    const source = read('pages/manager/analytics/page.tsx');
    assert.match(source, /setAnalyticsError\(analyticsResult\.data \? null :/);
    assert.match(source, /const noLeadsYet = Boolean\(analyticsData\) && \(analyticsData\?\.total_leads \?\? 0\) === 0;/);
});

test('a manager publish that awaits approval is not announced as published (MB-0702, MB-0880)', () => {
    const source = read('pages/manager/dashboard/properties/[id]/page.tsx');
    assert.match(source, /const awaitingApproval = String\(updatedProperty\.status \|\| ''\)\.toLowerCase\(\) === 'pending_approval';/);
    assert.match(source, /'Submitted for approval\. It goes live once an admin approves it\.'/);
});
