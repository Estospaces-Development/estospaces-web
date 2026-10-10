import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import type { VerificationStatus } from '@/services/managerVerificationService';
import ManagerVerificationContext, { useManagerViewOnly } from './ManagerVerificationContext';

const Probe = () => <span data-view-only>{String(useManagerViewOnly())}</span>;

const renderWith = (verificationStatus: VerificationStatus | null, bookingReadOnly?: boolean) => renderToStaticMarkup(
    <ManagerVerificationContext.Provider
        value={{
            verificationStatus,
            managerProfile: bookingReadOnly === undefined ? null : { booking_read_only: bookingReadOnly },
        } as unknown as NonNullable<React.ContextType<typeof ManagerVerificationContext>>}
    >
        <Probe />
    </ManagerVerificationContext.Provider>,
);

// Owner decision (10 Oct 2026): rejected or revoked managers are read-only; managers waiting for review keep working.
test('useManagerViewOnly is true only for a rejected manager', () => {
    assert.match(renderWith('rejected'), />true</);
    for (const status of ['approved', 'submitted', 'under_review', 'verification_required', 'incomplete', null] as const) {
        assert.match(renderWith(status), />false</, String(status));
    }
});

test('useManagerViewOnly stays true for a rejected manager who resubmitted and waits for review', () => {
    assert.match(renderWith('submitted', true), />true</);
    assert.match(renderWith('under_review', true), />true</);
    assert.match(renderWith('submitted', false), />false</);
    assert.match(renderWith('approved', false), />false</);
});

test('useManagerViewOnly is false outside the provider, so shared components can call it for any role', () => {
    assert.match(renderToStaticMarkup(<Probe />), />false</);
});
