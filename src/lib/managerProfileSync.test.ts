import test from 'node:test';
import assert from 'node:assert/strict';

import { buildManagerProfileSyncPayload } from './managerProfileSync';

test('builds the canonical manager profile payload used by admin verification', () => {
    const payload = buildManagerProfileSyncPayload({
        profileType: 'company',
        fallbackFullName: 'Thai Lal',
        companyName: '  Thai Lal Estates  ',
        branchName: '  Chennai Branch  ',
        bio: '  Local property specialists.  ',
        licenseNumber: '  REG-385  ',
        businessPhone: '  +91 44 0000 0000  ',
        personalPhone: '+91 90000 00000',
        companyAddress: '  1 Company Road, Chennai  ',
        personalAddress: '2 Home Road, Chennai',
        registeredOfficeAddress: '  3 Registered Road, Chennai  ',
        serviceAreas: '600001, 600002',
        dispatchPincodes: '600001, sw1a 1aa',
        complaintsContact: '  complaints@example.com  ',
        redressSchemeName: '  Property Redress Scheme  ',
        redressMembershipNumber: '  PRS-385  ',
        cmpProvider: '  Example CMP  ',
        cmpCertificateUrl: '  https://example.com/cmp.pdf  ',
        taxId: '  GST-385  ',
    });

    assert.deepEqual(payload, {
        profile_type: 'company',
        company_name: 'Thai Lal Estates',
        branch_name: 'Chennai Branch',
        company_description: 'Local property specialists.',
        company_registration_number: 'REG-385',
        business_phone: '+91 44 0000 0000',
        company_address: '1 Company Road, Chennai',
        registered_office_address: '3 Registered Road, Chennai',
        service_areas: ['600001', '600002'],
        dispatch_pincodes: ['600001', 'SW1A 1AA'],
        complaints_contact: 'complaints@example.com',
        redress_scheme_name: 'Property Redress Scheme',
        redress_membership_number: 'PRS-385',
        cmp_provider: 'Example CMP',
        cmp_certificate_url: 'https://example.com/cmp.pdf',
        tax_id: 'GST-385',
    });
});

test('falls back to manager contact data without removing spaces from branch names', () => {
    const payload = buildManagerProfileSyncPayload({
        profileType: 'broker',
        fallbackFullName: '  Thai Lal  ',
        companyName: '',
        branchName: 'Chennai Branch',
        bio: '',
        licenseNumber: 'BROKER-385',
        businessPhone: '',
        personalPhone: '+91 90000 00000',
        companyAddress: '',
        personalAddress: '1 Main Street',
        registeredOfficeAddress: '',
        serviceAreas: '',
        dispatchPincodes: '',
        complaintsContact: '',
        redressSchemeName: '',
        redressMembershipNumber: '',
        cmpProvider: '',
        cmpCertificateUrl: '',
        taxId: '',
    });

    assert.equal(payload.company_name, 'Thai Lal');
    assert.equal(payload.branch_name, 'Chennai Branch');
    assert.equal(payload.business_phone, '+91 90000 00000');
    assert.equal(payload.company_address, '1 Main Street');
    assert.equal(payload.registered_office_address, '1 Main Street');
});
