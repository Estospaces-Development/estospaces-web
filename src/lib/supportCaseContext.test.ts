import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildPrefilledSupportComposer,
    buildUserFastTrackCasePath,
    buildUserHelpPath,
    getSupportCaseIdFromSearchParams,
    getSupportTicketCaseLink,
} from '@/lib/supportCenter';

const CASE_ID = '95979976-d8b3-4b38-aed1-69a06a729c96';
const OTHER_CASE_ID = '0b8f5f7e-3c1a-4a55-9f5e-1d2c3b4a5f60';
const USER_CATEGORIES = ['General Inquiry', 'Buying Help', 'Renting Help', 'Fast Track', 'Contracts', 'Technical Issue'];

test('Help opened from a Fast Track case carries that exact case into the composer', () => {
    const helpPath = buildUserHelpPath('/user/dashboard/fast-track', `?case=${CASE_ID}`);
    const [pathname, query] = helpPath.split('?');
    const params = new URLSearchParams(query);
    assert.equal(pathname, '/user/dashboard/help');
    assert.equal(params.get('case'), CASE_ID);
    assert.equal(getSupportCaseIdFromSearchParams(params), CASE_ID);

    const composer = buildPrefilledSupportComposer({
        searchParams: params, availableCategories: USER_CATEGORIES, fallbackCategory: 'General Inquiry', priority: 'medium',
    });
    assert.equal(composer.category, 'Fast Track');
    assert.equal(composer.subject, 'Fast Track case 95979976');
    assert.ok(composer.message.includes(CASE_ID), 'the full case ID is in the ticket without retyping');
});

test('two different cases produce two different Help contexts', () => {
    const first = new URLSearchParams(buildUserHelpPath('/user/dashboard/fast-track', `?case=${CASE_ID}`).split('?')[1]);
    const second = new URLSearchParams(buildUserHelpPath('/user/dashboard/fast-track/', `?case=${OTHER_CASE_ID}&tab=viewing`).split('?')[1]);
    assert.equal(first.get('case'), CASE_ID);
    assert.equal(second.get('case'), OTHER_CASE_ID);
});

test('Help from anywhere else stays uncoupled from a case', () => {
    assert.equal(buildUserHelpPath('/user/dashboard', ''), '/user/dashboard/help');
    assert.equal(buildUserHelpPath('/user/dashboard', `?case=${CASE_ID}`), '/user/dashboard/help');
    assert.equal(buildUserHelpPath('/user/dashboard/fast-track', ''), '/user/dashboard/help');
    assert.equal(buildUserHelpPath('/user/dashboard/fast-track', '?case=not-a-case'), '/user/dashboard/help');
});

test('a malformed case param is never treated as case context', () => {
    for (const value of ['', '../admin', 'javascript:alert(1)', `${CASE_ID}/extra`, `${CASE_ID}x`]) {
        assert.equal(getSupportCaseIdFromSearchParams(new URLSearchParams({ case: value })), null, value);
    }
});

test('a ticket raised from a case links back to that case for the user and admin only', () => {
    const page = buildUserFastTrackCasePath(CASE_ID);
    assert.deepEqual(getSupportTicketCaseLink(page, 'user'), { caseId: CASE_ID, path: `/user/dashboard/fast-track?case=${CASE_ID}` });
    assert.deepEqual(getSupportTicketCaseLink(page, 'admin'), { caseId: CASE_ID, path: `/admin/fast-track?case=${CASE_ID}` });
    assert.equal(getSupportTicketCaseLink(page, 'manager'), null);
});

test('client-supplied ticket pages that are not a case path never become links', () => {
    for (const page of [
        undefined,
        '/user/dashboard/help',
        '/user/dashboard/fast-track',
        `https://evil.example/user/dashboard/fast-track?case=${CASE_ID}`,
        `//evil.example/user/dashboard/fast-track?case=${CASE_ID}`,
        `/user/dashboard/fast-track-evil?case=${CASE_ID}`,
        '/user/dashboard/fast-track?case=javascript:alert(1)',
    ]) {
        assert.equal(getSupportTicketCaseLink(page, 'user'), null, String(page));
    }
});
