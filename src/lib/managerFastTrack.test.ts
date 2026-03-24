import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildManagerFastTrackSearchParams,
    resolveManagerFastTrackSelection,
} from './managerFastTrack';

test('resolveManagerFastTrackSelection prefers a requested case id', () => {
    assert.equal(
        resolveManagerFastTrackSelection(
            [
                { caseId: 'case-a', leadId: 'lead-a' },
                { caseId: 'case-b', leadId: 'lead-b' },
            ],
            'case-b',
            'lead-a',
            'case-a',
        ),
        'case-b',
    );
});

test('resolveManagerFastTrackSelection can match a requested lead through matchingLead', () => {
    assert.equal(
        resolveManagerFastTrackSelection(
            [
                { caseId: 'case-a', leadId: undefined, matchingLead: { id: 'lead-a' } },
                { caseId: 'case-b', leadId: undefined, matchingLead: { id: 'lead-b' } },
            ],
            null,
            'lead-b',
            'case-a',
        ),
        'case-b',
    );
});

test('resolveManagerFastTrackSelection stays on the list page without a requested case or lead', () => {
    assert.equal(
        resolveManagerFastTrackSelection(
            [
                { caseId: 'case-a', leadId: 'lead-a' },
                { caseId: 'case-b', leadId: 'lead-b' },
            ],
            null,
            null,
            'case-a',
        ),
        null,
    );
});

test('buildManagerFastTrackSearchParams keeps the selected case and drops stale lead filters', () => {
    const next = buildManagerFastTrackSearchParams(
        new URLSearchParams('case=case-a&lead=lead-a&user=user-a'),
        'case-b',
    );

    assert.equal(next.get('case'), 'case-b');
    assert.equal(next.get('lead'), null);
    assert.equal(next.get('user'), 'user-a');
});
