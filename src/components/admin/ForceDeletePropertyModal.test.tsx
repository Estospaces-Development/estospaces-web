import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ForceDeletePropertyModal, { FORCE_DELETE_PROPERTY_STEPS } from './ForceDeletePropertyModal';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const noop = () => undefined;

test('the "Delete anyway" dialog shows the refusal, what will be closed and what still blocks', () => {
    const markup = renderToStaticMarkup(
        <ForceDeletePropertyModal refusal="This property cannot be deleted while it has active bookings (2 open applications)." loading={false} onClose={noop} onConfirm={noop} />,
    );

    assert.match(markup, /role="dialog"/);
    assert.match(markup, /Delete anyway\?/);
    assert.match(markup, /2 open applications/);
    for (const step of FORCE_DELETE_PROPERTY_STEPS) {
        assert.ok(markup.includes(step.replace(/"/g, '&quot;')), `missing step: ${step}`);
    }
    assert.match(markup, /signed contract still in force, a confirmed stay that has not ended or a paid Fast Track still blocks the delete/);
    // Exactly who Booking notifies, and who only sees the status.
    assert.match(markup, /Notified: the person who booked each viewing, both parties to each contract, and the assigned manager of a Fast Track still in progress/);
    assert.match(markup, /Applicants, Fast Track users and guests with a pending reservation are not notified/);
    assert.match(markup, />Delete anyway</);
});

test('the dialog stays closed until core refuses a delete', () => {
    assert.equal(renderToStaticMarkup(<ForceDeletePropertyModal refusal={null} loading={false} onClose={noop} onConfirm={noop} />), '');
});

test('admin pages offer "Delete anyway" only for the active-booking refusal and then force the delete', () => {
    for (const page of ['src/pages/admin/properties/page.tsx', 'src/pages/admin/properties/[id]/page.tsx']) {
        const source = read(page);
        assert.match(source, /if \(error && code === PROPERTY_ACTIVE_BOOKING_WORK_CODE\) \{/, page);
        assert.match(source, /await deletePropertyRequest\([^)]*, \{ force: true \}\)/, page);
        assert.match(source, /<ForceDeletePropertyModal/, page);
        // A force that may have closed some items keeps "Delete anyway" open with core's message.
        assert.match(source, /if \(error && code === PROPERTY_FORCE_DELETE_INCOMPLETE_CODE\) \{\s*\/\/[^\n]*\n\s*setForceDelete(Refusal)?\((\{ propertyId, refusal: error \}|error)\);/, page);
        assert.doesNotMatch(source, /window\.confirm|[^.\w]confirm\(/, page);
    }
});

test('manager pages never force a delete', () => {
    for (const path of ['src/contexts/PropertyContext.tsx', 'src/pages/manager/dashboard/properties/page.tsx', 'src/pages/manager/dashboard/properties/[id]/page.tsx']) {
        const source = read(path);
        assert.doesNotMatch(source, /force: true|ForceDeletePropertyModal/, path);
    }
});
