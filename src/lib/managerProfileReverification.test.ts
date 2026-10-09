import assert from 'node:assert/strict';
import test from 'node:test';

import { buildManagerProfileSyncPayload } from '@/lib/managerProfileSync';
import { mapManagerProfile, type ManagerProfile } from '@/services/managerVerificationService';
import { formatReverificationWarning, getReverificationTriggerFields } from './managerProfileReverification';

// A verified broker profile as core returns it from GET /api/v1/brokers/profile.
const coreRecord = {
    user_id: 'manager-1',
    profile_type: 'company',
    company_name: 'Srini Agency',
    branch_name: 'Chennai Pilot Branch',
    company_description: 'Lettings in Chennai',
    company_reg_number: 'REG-1',
    business_phone: '+91 98765 43210',
    company_address: '1 Anna Salai',
    registered_office_address: '1 Anna Salai',
    complaints_contact: 'complaints@example.test',
    redress_scheme_name: 'Scheme',
    redress_membership_number: 'RM-1',
    cmp_provider: 'CMP Ltd',
    cmp_certificate_url: 'https://example.test/cmp.pdf',
    tax_id: 'TAX-1',
    service_areas: '["600001"]',
    dispatch_pincodes: '["600001"]',
    has_client_money: true,
    verification_status: 'verified',
};

const verified = (overrides: Record<string, unknown> = {}): ManagerProfile => mapManagerProfile({ ...coreRecord, ...overrides });

// Mirrors how the profile page turns its form into the broker-profile payload.
const formPayload = (overrides: Partial<Parameters<typeof buildManagerProfileSyncPayload>[0]> = {}) => buildManagerProfileSyncPayload({
    profileType: 'company',
    fallbackFullName: 'Srini Manager',
    companyName: 'Srini Agency',
    branchName: 'Chennai Pilot Branch',
    bio: 'Lettings in Chennai',
    licenseNumber: 'REG-1',
    businessPhone: '+91 98765 43210',
    personalPhone: '',
    companyAddress: '1 Anna Salai',
    personalAddress: '',
    registeredOfficeAddress: '1 Anna Salai',
    serviceAreas: '600001',
    dispatchPincodes: '600001',
    complaintsContact: 'complaints@example.test',
    redressSchemeName: 'Scheme',
    redressMembershipNumber: 'RM-1',
    cmpProvider: 'CMP Ltd',
    cmpCertificateUrl: 'https://example.test/cmp.pdf',
    taxId: 'TAX-1',
    ...overrides,
});

test('an unchanged save of a verified profile needs no warning', () => {
    assert.deepEqual(getReverificationTriggerFields(verified(), formPayload()), []);
});

test('changing the branch or complaints contact warns before re-verification (QA-MB-20260923-01-029)', () => {
    assert.deepEqual(getReverificationTriggerFields(verified(), formPayload({ branchName: 'Chennai Branch' })), ['Branch name']);
    assert.deepEqual(
        getReverificationTriggerFields(verified(), formPayload({ complaintsContact: 'help@example.test', branchName: 'Chennai Branch' })),
        ['Branch name', 'Complaints contact'],
    );
});

test('fields core does not treat as verification evidence never warn', () => {
    const payload = formPayload({ bio: 'New bio', serviceAreas: '600002', dispatchPincodes: '600002' });
    assert.deepEqual(getReverificationTriggerFields(verified(), payload), []);
});

test('each core trigger field sent by the profile page is detected', () => {
    const cases: Array<[Partial<Parameters<typeof buildManagerProfileSyncPayload>[0]>, string]> = [
        [{ companyName: 'Other Agency' }, 'Company name'],
        [{ licenseNumber: 'REG-2' }, 'License / registration number'],
        [{ businessPhone: '+91 90000 00000' }, 'Business phone'],
        [{ registeredOfficeAddress: '2 Mount Road' }, 'Registered office address'],
        [{ redressSchemeName: 'Other Scheme' }, 'Redress scheme'],
        [{ redressMembershipNumber: 'RM-2' }, 'Redress membership number'],
        [{ cmpCertificateUrl: 'https://example.test/cmp-2.pdf' }, 'Client money protection certificate URL'],
        [{ taxId: 'TAX-2' }, 'Tax ID'],
    ];
    for (const [override, label] of cases) {
        assert.deepEqual(getReverificationTriggerFields(verified(), formPayload(override)), [label], label);
    }
    assert.deepEqual(
        getReverificationTriggerFields(verified(), formPayload({ companyAddress: '9 Beach Road', registeredOfficeAddress: '1 Anna Salai' })),
        ['Company address'],
    );
    assert.deepEqual(
        getReverificationTriggerFields(verified(), formPayload({ cmpProvider: '', cmpCertificateUrl: '' })),
        ['Client money protection provider', 'Client money protection certificate URL', 'Client money handling'],
    );
    assert.deepEqual(getReverificationTriggerFields(verified(), { profile_type: 'broker' }), ['Profile type']);
});

test('core compares exactly, so a stored value the save would reformat still warns', () => {
    assert.deepEqual(getReverificationTriggerFields(verified({ branch_name: 'Chennai Pilot Branch ' }), formPayload()), ['Branch name']);
    // Display mapping hides placeholder company names and derives client-money handling;
    // the comparison uses what core stored.
    assert.deepEqual(getReverificationTriggerFields(verified({ company_name: 'Estospaces - 12' }), formPayload()), ['Company name']);
    assert.deepEqual(getReverificationTriggerFields(verified({ has_client_money: false }), formPayload()), ['Client money handling']);
});

test('managers who are not verified are never warned, because core does not re-verify them', () => {
    for (const status of ['pending', 'under_review', 'rejected', 'verification_required', 'incomplete']) {
        assert.deepEqual(
            getReverificationTriggerFields(verified({ verification_status: status }), formPayload({ branchName: 'Chennai Branch' })),
            [],
            status,
        );
    }
    assert.deepEqual(getReverificationTriggerFields(null, formPayload()), []);
    assert.deepEqual(getReverificationTriggerFields(verified(), null), []);
});

test('the warning names the fields, the consequence and that reverting does not restore verification', () => {
    const single = formatReverificationWarning(['Branch name']);
    assert.match(single, /^Changing Branch name will require re-verification\./);
    assert.match(single, /new Fast Track cases pause and subscription checkout is unavailable/);
    assert.match(single, /Existing Fast Track cases, appointments and contracts stay open and you can keep working on them/);
    assert.match(single, /Changing the value back later does not restore verification/);
    assert.match(formatReverificationWarning(['Branch name', 'Tax ID', 'Complaints contact']), /^Changing Branch name, Tax ID and Complaints contact will/);
});
