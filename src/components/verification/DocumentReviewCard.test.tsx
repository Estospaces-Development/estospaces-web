import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Window } from 'happy-dom';

import { DocumentReviewCard, getDocumentReviewActions } from './UserVerificationReviewModal';
import type { UserDocument } from '@/services/userVerificationService';

const noop = () => undefined;

const renderCard = (status: UserDocument['status']) => {
    const window = new Window();
    window.document.body.innerHTML = renderToStaticMarkup(
        <DocumentReviewCard
            document={{
                id: 'doc-1',
                user_id: 'user-1',
                document_type: 'government_id',
                document_category: 'identity',
                file_name: 'doc.pdf',
                file_url: 'https://example.com/doc.pdf',
                status,
                created_at: '2026-10-01T10:00:00.000Z',
                updated_at: '2026-10-01T10:00:00.000Z',
            }}
            onApprove={noop}
            onRequestChanges={noop}
            onReject={noop}
            onView={noop}
            loading={false}
        />,
    );
    return window;
};

const buttonLabels = (window: Window) => (
    Array.from(window.document.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
);

const expectedButtons: Array<[UserDocument['status'], string[]]> = [
    ['pending', ['Approve doc.pdf', 'Request re-upload for doc.pdf', 'Reject doc.pdf', 'View doc.pdf']],
    ['under_review', ['Approve doc.pdf', 'Request re-upload for doc.pdf', 'Reject doc.pdf', 'View doc.pdf']],
    ['approved', ['Request re-upload for approved doc.pdf', 'Reject approved doc.pdf', 'View doc.pdf']],
    ['rejected', ['Approve doc.pdf', 'Request re-upload for doc.pdf', 'View doc.pdf']],
    ['reupload_required', ['Reject doc.pdf', 'View doc.pdf']],
];

for (const [status, labels] of expectedButtons) {
    test(`document review card offers only the actions that fit a ${status} document`, () => {
        const window = renderCard(status);
        try {
            assert.deepEqual(buttonLabels(window), labels);
        } finally {
            window.close();
        }
    });
}

test('a document waiting for a re-upload explains the wait instead of offering a second request or approval', () => {
    const window = renderCard('reupload_required');
    try {
        assert.match(window.document.body.textContent || '', /Waiting for the user to upload a replacement/);
        assert.equal(window.document.querySelector('[aria-label^="Request re-upload"]'), null);
        assert.equal(window.document.querySelector('[aria-label^="Approve"]'), null);
    } finally {
        window.close();
    }
});

test('other statuses do not show the waiting note', () => {
    for (const status of ['pending', 'under_review', 'approved', 'rejected'] as const) {
        const window = renderCard(status);
        try {
            assert.doesNotMatch(window.document.body.textContent || '', /Waiting for the user to upload a replacement/);
        } finally {
            window.close();
        }
    }
});

test('review actions are derived from the status and unknown statuses offer none', () => {
    assert.deepEqual(getDocumentReviewActions('pending'), { approve: true, requestReupload: true, reject: true, waitingForReplacement: false });
    assert.deepEqual(getDocumentReviewActions('approved'), { approve: false, requestReupload: true, reject: true, waitingForReplacement: false });
    assert.deepEqual(getDocumentReviewActions('rejected'), { approve: true, requestReupload: true, reject: false, waitingForReplacement: false });
    assert.deepEqual(getDocumentReviewActions('reupload_required'), { approve: false, requestReupload: false, reject: true, waitingForReplacement: true });
    assert.deepEqual(getDocumentReviewActions('something_new'), { approve: false, requestReupload: false, reject: false, waitingForReplacement: false });
});

test('Request Re-upload uses the same amber outline everywhere and never the red Reject style', () => {
    for (const status of ['pending', 'approved', 'rejected'] as const) {
        const window = renderCard(status);
        try {
            const button = window.document.querySelector('[aria-label^="Request re-upload"]');
            assert.ok(button, `${status}: Request Re-upload is offered`);
            const classes = Array.from(button.classList);
            assert.ok(classes.includes('border-amber-200'), `${status}: amber border`);
            assert.ok(classes.includes('text-amber-700'), `${status}: amber text`);
            assert.ok(!classes.some((name) => /^(bg|text|border)-red-/.test(name)), `${status}: not red`);
        } finally {
            window.close();
        }
    }
});

test('review buttons share one action-group wrapper in every status', () => {
    const wrapperClasses = new Set<string>();
    for (const status of ['pending', 'approved', 'rejected', 'reupload_required'] as const) {
        const window = renderCard(status);
        try {
            const button = window.document.querySelector('[aria-label^="Request re-upload"], [aria-label^="Reject"]');
            assert.ok(button, `${status}: has a review action`);
            wrapperClasses.add(button.parentElement?.className || '');
        } finally {
            window.close();
        }
    }
    assert.equal(wrapperClasses.size, 1, `expected one wrapper class, got ${Array.from(wrapperClasses).join(' | ')}`);
});
