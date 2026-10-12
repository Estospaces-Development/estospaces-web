import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ManagerStatusTracker from './StatusTracker';
import UserStatusTracker from '../../dashboard/applications/StatusTracker';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const CANCELLED = 'This application was closed because the Fast Track case was cancelled.';

// booking#111: the server says who closed a withdrawn application; the manager never withdrew it.
test('the withdrawn banner shows the server reason, with a role-correct fallback', () => {
    const managerWithReason = renderToStaticMarkup(<ManagerStatusTracker status="withdrawn" listingType="rent" statusReason={CANCELLED} />);
    assert.ok(managerWithReason.includes(CANCELLED));
    assert.ok(!managerWithReason.includes('You have withdrawn this application'));
    const managerFallback = renderToStaticMarkup(<ManagerStatusTracker status="withdrawn" listingType="rent" />);
    assert.ok(managerFallback.includes('The applicant withdrew this application'));
    assert.ok(!managerFallback.includes('You have withdrawn this application'));

    assert.ok(renderToStaticMarkup(<UserStatusTracker status="withdrawn" listingType="rent" statusReason={CANCELLED} />).includes(CANCELLED));
    assert.ok(renderToStaticMarkup(<UserStatusTracker status="withdrawn" listingType="rent" />).includes('You have withdrawn this application'));

    assert.match(read('./ApplicationDetail.tsx'), /<StatusTracker[\s\S]*?statusReason=\{application\.journeyStatusReason\}[\s\S]*?\/>/);
    assert.match(read('../../dashboard/applications/ApplicationDetail.tsx'), /<StatusTracker[\s\S]*?statusReason=\{application\.journeyStatusReason\}[\s\S]*?\/>/);
});

// Booking refuses any change to a withdrawn or rejected application; its workflow controls must not look live.
test('a withdrawn or rejected application shows its rent and purchase workflow read-only', () => {
    const source = read('./ApplicationDetail.tsx');
    assert.match(source, /const applicationClosed =\s*application\?\.status === APPLICATION_STATUS\.WITHDRAWN \|\|\s*application\?\.status === APPLICATION_STATUS\.REJECTED;/);
    for (const ref of ['purchaseWorkspaceSectionRef', 'rentWorkspaceSectionRef']) {
        const at = source.indexOf(`ref={${ref}}`);
        const before = source.slice(source.lastIndexOf('<fieldset', at), at);
        assert.match(before, /^<fieldset disabled=\{applicationClosed\}[^>]*>\s*\{closedWorkflowNote\}\s*<div\s*$/, ref);
    }
    for (const error of ['purchaseWorkflowError', 'rentWorkflowError']) {
        assert.match(source, new RegExp(`: ${error}\\}\\s*</div>\\s*\\)\\}\\s*</div>\\s*</fieldset>\\s*\\)\\}`), error);
    }
});

// Booking refuses workflow actions on a cancelled case (errFastTrackCaseClosed); handover keeps its controls.
test('the Fast Track companion shows no stage actions on a closed case outside handover', () => {
    const source = read('../../fast-track/FastTrackCompanionPanel.tsx');
    const start = source.indexOf('const renderStageActions = () => {');
    const body = source.slice(start, source.indexOf('switch (fastTrackCase.stage)', start));
    assert.match(body, /if \(fastTrackCase\.workspaceFinalStatus !== "active" && fastTrackCase\.stage !== "handover"\) \{/);
    assert.ok(body.includes('This Fast Track case is closed, so its actions are read-only.'));
});
