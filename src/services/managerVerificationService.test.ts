import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getManagerApprovalBlocker,
  isPlaceholderManagerCompanyName,
  mapManagerProfile,
  normalizeManagerServiceAreas,
  type ManagerDocument,
  type ManagerProfile,
} from './managerVerificationService';

test('manager company validation rejects internal Estospaces identifiers', () => {
  assert.equal(isPlaceholderManagerCompanyName('Estospaces - 321123'), true);
  assert.equal(isPlaceholderManagerCompanyName('SRINI Agency'), false);
});

const buildProfile = (overrides: Partial<ManagerProfile> = {}): ManagerProfile => ({
  id: 'manager-1',
  profile_type: 'broker',
  company_name: 'Manager Co',
  branch_name: 'Central',
  business_phone: '+440000000000',
  license_number: 'BROKER-12345',
  company_registration_number: 'BROKER-12345',
  company_address: '1 Office Street',
  registered_office_address: '1 Office Street',
  complaints_contact: 'complaints@example.com',
  redress_scheme_name: 'Property Redress Scheme',
  redress_membership_number: 'PRS-123',
  has_ombudsman: false,
  has_insurance: false,
  has_client_money: false,
  arla_member: false,
  naea_member: false,
  rics_member: false,
  verification_status: 'submitted',
  agency_verification_status: 'submitted',
  created_at: '2026-06-15T08:00:00.000Z',
  updated_at: '2026-06-15T08:00:00.000Z',
  ...overrides,
});

const buildDocument = (
  document_type: ManagerDocument['document_type'],
  verification_status: ManagerDocument['verification_status'] = 'pending',
): ManagerDocument => ({
  id: `${document_type}-doc`,
  manager_id: 'manager-1',
  document_type,
  document_url: `https://example.com/${document_type}.pdf`,
  verification_status,
  submitted_at: '2026-06-15T08:00:00.000Z',
  updated_at: '2026-06-15T08:00:00.000Z',
});

test('manager approval blocker requires professional evidence before approval', () => {
  const blocker = getManagerApprovalBlocker(
    buildProfile({ license_number: '', company_registration_number: '' }),
    [buildDocument('government_id'), buildDocument('broker_license')],
  );

  assert.match(blocker || '', /broker license number/);
});

test('manager approval blocker requires all required documents before approval', () => {
  const blocker = getManagerApprovalBlocker(
    buildProfile(),
    [buildDocument('government_id')],
  );

  assert.match(blocker || '', /Broker License/);
});

test('manager approval blocker rejects required documents that need replacement', () => {
  const blocker = getManagerApprovalBlocker(
    buildProfile(),
    [buildDocument('government_id'), buildDocument('broker_license', 'reupload_required')],
  );

  assert.match(blocker || '', /Replace rejected verification documents/);
});

test('manager approval blocker allows a complete broker profile with required documents', () => {
  const blocker = getManagerApprovalBlocker(
    buildProfile(),
    [buildDocument('government_id'), buildDocument('broker_license')],
  );

  assert.equal(blocker, null);
});

test('manager service areas normalize json, csv, and duplicate entries', () => {
  assert.deepEqual(
    normalizeManagerServiceAreas('["600001", "600", "600001", " sw1a 1aa "]'),
    ['600001', '600', 'SW1A 1AA'],
  );

  assert.deepEqual(
    normalizeManagerServiceAreas('600001, 600\nbt9 7gg'),
    ['600001', '600', 'BT9 7GG'],
  );
});

test('manager profile mapping preserves the website and derives client money handling from saved evidence', () => {
  const profile = mapManagerProfile(
    {
      user_id: 'manager-1',
      profile_type: 'broker',
      cmp_provider: 'Example CMP',
      cmp_certificate_url: 'https://example.com/cmp.pdf',
      dispatch_pincodes: '["600001","400001"]',
      verification_status: 'submitted',
    },
    {
      email: 'manager@example.com',
      metadata: { website: ' https://estospaces.in ' },
    },
  );

  assert.equal(profile.website, 'https://estospaces.in');
  assert.equal(profile.has_client_money, true);
  assert.deepEqual(profile.dispatch_pincodes, ['600001', '400001']);
});

test('manager profile mapping preserves intentional empty values after an update', () => {
  const profile = mapManagerProfile({
    user_id: 'manager-1',
    profile_type: 'broker',
    company_description: '',
    complaints_contact: '',
    cmp_provider: '',
    cmp_certificate_url: '',
    verification_status: 'submitted',
  });

  assert.equal(profile.company_description, '');
  assert.equal(profile.complaints_contact, '');
  assert.equal(profile.cmp_provider, '');
  assert.equal(profile.cmp_certificate_url, '');
});
