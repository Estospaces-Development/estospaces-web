import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getMissingVerificationBundleFileKeys,
  hasAnyRequiredVerificationDocument,
  shouldRequireFirstTimeVerificationBundle,
  USER_FIRST_TIME_VERIFICATION_REQUIREMENTS,
} from './verificationUploadGate';

test('user first-time verification requires identity and address together', () => {
  assert.equal(
    shouldRequireFirstTimeVerificationBundle([], USER_FIRST_TIME_VERIFICATION_REQUIREMENTS),
    true,
  );

  assert.equal(
    shouldRequireFirstTimeVerificationBundle(
      [{ document_category: 'identity', document_type: 'government_id' }],
      USER_FIRST_TIME_VERIFICATION_REQUIREMENTS,
    ),
    false,
  );

  assert.equal(
    shouldRequireFirstTimeVerificationBundle(
      [{ document_category: 'address', document_type: 'address_proof' }],
      USER_FIRST_TIME_VERIFICATION_REQUIREMENTS,
    ),
    false,
  );
});

test('manager first-time verification follows the current required document set', () => {
  const brokerRequiredDocuments = ['government_id', 'broker_license'] as const;
  const companyRequiredDocuments = ['company_registration', 'business_license', 'tax_certificate', 'representative_id'] as const;

  assert.equal(shouldRequireFirstTimeVerificationBundle([], brokerRequiredDocuments), true);
  assert.equal(shouldRequireFirstTimeVerificationBundle([], companyRequiredDocuments), true);

  assert.equal(
    shouldRequireFirstTimeVerificationBundle(
      [{ document_type: 'government_id', document_category: 'identity' }],
      brokerRequiredDocuments,
    ),
    false,
  );
});

test('first-time bundle file validation reports only missing required files', () => {
  const required = ['identity', 'address'] as const;
  const files = {
    identity: { name: 'id.pdf' } as File,
  };

  assert.deepEqual(getMissingVerificationBundleFileKeys(files, required), ['address']);
});

test('required verification document detection accepts category or exact document type', () => {
  assert.equal(
    hasAnyRequiredVerificationDocument(
      [{ document_category: 'identity', document_type: 'government_id' }],
      ['identity', 'address'],
    ),
    true,
  );

  assert.equal(
    hasAnyRequiredVerificationDocument(
      [{ document_category: 'identity', document_type: 'government_id' }],
      ['government_id', 'broker_license'],
    ),
    true,
  );

  assert.equal(
    hasAnyRequiredVerificationDocument(
      [{ document_category: 'financial', document_type: 'proof_of_funds' }],
      ['identity', 'address'],
    ),
    false,
  );
});
