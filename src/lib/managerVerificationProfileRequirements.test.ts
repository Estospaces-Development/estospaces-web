import assert from 'node:assert/strict';
import test from 'node:test';

import { getMissingManagerVerificationProfileFields } from './managerVerificationProfileRequirements';

const completeBrokerProfile = {
    profileType: 'broker' as const,
    companyName: 'Estospaces Agency',
    businessPhone: '+44 20 1234 5678',
    companyAddress: '1 Office Road, Preston',
    licenseNumber: 'LIC-123',
    branchName: 'Preston Branch',
    registeredOfficeAddress: '1 Office Road, Preston',
    complaintsContact: 'complaints@example.com',
    redressSchemeName: 'The Property Ombudsman',
    redressMembershipNumber: 'TPO-123',
    cmpProvider: '',
    cmpCertificateUrl: '',
};

test('lists every submission requirement that is blank on a manager profile', () => {
    const missing = getMissingManagerVerificationProfileFields({
        ...completeBrokerProfile,
        branchName: '',
        registeredOfficeAddress: '',
        complaintsContact: '',
        redressSchemeName: '',
        redressMembershipNumber: '',
    });

    assert.deepEqual(missing.map(({ field }) => field), [
        'branchName',
        'registeredOfficeAddress',
        'complaintsContact',
        'redressSchemeName',
        'redressMembershipNumber',
    ]);
});

test('requires client-money evidence only when the profile declares client money handling', () => {
    assert.deepEqual(
        getMissingManagerVerificationProfileFields({ ...completeBrokerProfile, hasClientMoney: true }).map(({ field }) => field),
        ['cmpProvider', 'cmpCertificateUrl'],
    );
    assert.deepEqual(
        getMissingManagerVerificationProfileFields(completeBrokerProfile),
        [],
    );
});
