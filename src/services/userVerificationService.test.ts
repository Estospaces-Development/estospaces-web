import assert from 'node:assert/strict';
import test from 'node:test';

import { countActionableUserVerifications, type UserVerificationInfo } from './userVerificationService';

const verification = (
    documentsUploaded: boolean,
    documentsVerified: boolean,
    overrides: Partial<UserVerificationInfo> = {},
): UserVerificationInfo => ({
    user_id: crypto.randomUUID(),
    email: 'qa@example.com',
    full_name: 'QA User',
    phone: '',
    avatar: '',
    address: '',
    postcode: '',
    verification_level: 'basic',
    has_identity_doc: documentsUploaded,
    has_address_doc: documentsUploaded,
    has_financial_doc: false,
    documents_uploaded: documentsUploaded,
    documents_verified: documentsVerified,
    lead_count: 0,
    pending_leads: 0,
    created_at: '2026-08-16T00:00:00Z',
    last_active: '2026-08-16T00:00:00Z',
    ...overrides,
});

test('pending verification count includes partial uploads and excludes approved or empty records', () => {
    assert.equal(countActionableUserVerifications([
        verification(true, false),
        verification(false, false, { has_identity_doc: true }),
        verification(true, true),
        verification(true, false, { verification_level: 'verified' }),
        verification(true, false, { verification_level: 'fully_verified' }),
        verification(false, false),
    ]), 2);
});
