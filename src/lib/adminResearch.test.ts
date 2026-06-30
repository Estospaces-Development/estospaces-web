import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    buildResearchEvidenceTarget,
    canMarkResearchSessionReviewed,
    getResearchSessionTitleError,
    getResearchTrackConfig,
    summarizeResearchWorkspace,
    type ResearchSession,
    type ResearchSummary,
} from './adminResearch';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(testDir, '..');

test('admin research exposes the three required research tracks and checklists', () => {
    const inApp = getResearchTrackConfig('in_app_journey');
    const broker = getResearchTrackConfig('broker_console');
    const callChat = getResearchTrackConfig('call_chat_review');

    assert.equal(inApp.title, 'In-App Journey Shadowing');
    assert.ok(inApp.checklist.some((item) => item.toLowerCase().includes('get this home in 24 hours')));
    assert.ok(broker.checklist.some((item) => item.toLowerCase().includes('notifications')));
    assert.ok(callChat.checklist.some((item) => item.toLowerCase().includes('consent')));
});

test('admin research summary keeps empty backend responses useful', () => {
    const summary = summarizeResearchWorkspace({
        total_sessions: 2,
        by_track: { in_app_journey: 1 },
        by_status: { reviewed: 1 },
        high_severity_observations: 3,
        consent_pending_reviews: 1,
        top_tags: [{ tag: 'sla timer confusion', count: 2 }],
    } as ResearchSummary);

    assert.equal(summary.totalSessions, 2);
    assert.equal(summary.byTrack.in_app_journey, 1);
    assert.equal(summary.byTrack.broker_console, 0);
    assert.equal(summary.byTrack.call_chat_review, 0);
    assert.equal(summary.byStatus.planned, 0);
    assert.equal(summary.byStatus.reviewed, 1);
    assert.equal(summary.highSeverityObservations, 3);
    assert.equal(summary.consentPendingReviews, 1);
    assert.equal(summary.topTags[0].tag, 'sla timer confusion');
});

test('call chat review cannot be marked reviewed before consent is visible', () => {
    const base = {
        id: 'research-1',
        track: 'call_chat_review',
        status: 'in_progress',
        title: 'Review support transcript',
        participant_role: 'user',
        owner_id: 'admin-1',
        consent_confirmed: false,
        created_at: '2026-05-08T09:00:00Z',
        updated_at: '2026-05-08T09:00:00Z',
    } as ResearchSession;

    assert.equal(canMarkResearchSessionReviewed(base), false);
    assert.equal(canMarkResearchSessionReviewed({
        ...base,
        consent_confirmed: true,
        consent_note: 'Consent captured in ticket T-1.',
    }), true);
    assert.equal(canMarkResearchSessionReviewed({ ...base, track: 'broker_console' }), true);
});

test('research session title validation blocks blank saves with clear copy', () => {
    assert.equal(getResearchSessionTitleError(''), 'Title is required before saving a research session.');
    assert.equal(getResearchSessionTitleError('   '), 'Title is required before saving a research session.');
    assert.equal(getResearchSessionTitleError('Broker console shadowing'), '');
});

test('research evidence links route to existing admin workspaces without copying private transcripts', () => {
    assert.deepEqual(
        buildResearchEvidenceTarget({ evidence_type: 'fast_track_case', reference_id: 'case-1' }),
        { label: 'Open fast-track case', path: '/admin/fast-track?case=case-1' },
    );
    assert.deepEqual(
        buildResearchEvidenceTarget({ evidence_type: 'conversation', reference_id: 'conversation-1' }),
        { label: 'Open support conversation', path: '/admin/help?conversation=conversation-1' },
    );
    assert.deepEqual(
        buildResearchEvidenceTarget({ evidence_type: 'external_url', external_url: 'https://recordings.example.com/call-1' }),
        { label: 'Open external evidence', path: 'https://recordings.example.com/call-1', external: true },
    );
});

test('admin research route is registered in app navigation and dashboard', () => {
    const appSource = readFileSync(path.join(srcRoot, 'App.tsx'), 'utf8');
    const sidebarSource = readFileSync(path.join(srcRoot, 'components/layout/AdminSidebar.tsx'), 'utf8');
    const headerSource = readFileSync(path.join(srcRoot, 'components/layout/AdminHeader.tsx'), 'utf8');
    const dashboardSource = readFileSync(path.join(srcRoot, 'pages/admin/dashboard/page.tsx'), 'utf8');

    assert.match(appSource, /pages\/admin\/research\/page/);
    assert.match(appSource, /path="research"/);
    assert.match(sidebarSource, /Observational Research/);
    assert.match(headerSource, /Observational Research/);
    assert.match(dashboardSource, /Observational Research/);
    assert.match(dashboardSource, /\/admin\/research/);
});

test('admin research session modal exposes dialog semantics', () => {
    const researchPageSource = readFileSync(path.join(srcRoot, 'pages/admin/research/page.tsx'), 'utf8');

    assert.match(researchPageSource, /role="dialog"/);
    assert.match(researchPageSource, /aria-modal="true"/);
    assert.match(researchPageSource, /aria-labelledby="research-session-modal-title"/);
    assert.match(researchPageSource, /id="research-session-modal-title"/);
    assert.match(researchPageSource, /research-session-title-error/);
    assert.match(researchPageSource, /aria-invalid=\{sessionTitleError \? 'true' : 'false'\}/);
    assert.match(researchPageSource, /disabled=\{!canSaveSession\}/);
});
