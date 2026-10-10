import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { shouldShowAddressLine } from '../components/manager/applications/ApplicationCard';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Offer amount inputs carry an accessible name', () => {
    for (const path of ['../components/fast-track/FastTrackWorkspace.tsx', '../components/fast-track/FastTrackCompanionPanel.tsx']) {
        assert.match(read(path), /placeholder="Offer amount"\s+aria-label="Offer amount"/, path);
    }
});

test('Sign agreement asks for confirmation naming the property before signing', () => {
    const source = read('../components/fast-track/FastTrackWorkspace.tsx');
    // The button only opens the dialog; the action runs from the dialog's confirm handler.
    assert.match(source, /onClick=\{\(\) => setSignAgreementConfirmOpen\(true\)\}/);
    assert.doesNotMatch(source, /onClick=\{\(\) => void runAction\('confirm_agreement'[^\n]*\n[^\n]*busy=\{activeAction === 'confirm_agreement'\}/);
    assert.match(source, /onClose=\{\(\) => setSignAgreementConfirmOpen\(false\)\}/);
    assert.match(source, /You are signing the agreement for \$\{selectedCaseDisplayTitle\}/);
    const confirmHandler = source.match(/onConfirm=\{\(\) => \{\s*setSignAgreementConfirmOpen\(false\);\s*void runAction\('confirm_agreement'/);
    assert.ok(confirmHandler, 'confirm handler signs');
});

test('manager application card shows the address once and the applicant name', () => {
    assert.equal(shouldShowAddressLine('12 High Street, Leeds', '12 High Street,  Leeds'), false);
    assert.equal(shouldShowAddressLine('Sunny 2 bed flat', '12 High Street, Leeds'), true);
    assert.equal(shouldShowAddressLine('', '12 High Street, Leeds'), true);
    const source = read('../components/manager/applications/ApplicationCard.tsx');
    assert.match(source, /application\.applicantName \|\| 'Applicant'/);
    assert.doesNotMatch(source, /<span className="truncate">\{application\.agentName\}<\/span>/);
});

test('manager application detail messages the applicant, not an agent', () => {
    const source = read('../components/manager/applications/ApplicationDetail.tsx');
    assert.match(source, /: "Message applicant"/);
    assert.doesNotMatch(source, /"Message Agent"/);
});
