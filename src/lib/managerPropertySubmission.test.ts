import test from 'node:test';
import assert from 'node:assert/strict';
import { getManagerPropertySubmissionBlocker } from '@/lib/managerPropertySubmission';

test('blocks submission when no manager profile is available', () => {
    assert.equal(
        getManagerPropertySubmissionBlocker(null),
        'Complete your manager verification before you submit a property for admin approval.',
    );
});

test('blocks submission while manager verification is still pending', () => {
    assert.equal(
        getManagerPropertySubmissionBlocker({
            verification_status: 'submitted',
            agency_verification_status: 'approved',
            branch_name: 'Belfast',
            registered_office_address: '1 Office Street',
            complaints_contact: 'ops@example.com',
            redress_scheme_name: 'PRS',
            redress_membership_number: 'PRS-1',
            cmp_provider: '',
            cmp_certificate_url: '',
            has_client_money: false,
        }),
        'Your manager verification must be approved before you can submit a property for admin approval.',
    );
});

test('blocks submission while agency verification is pending', () => {
    assert.equal(
        getManagerPropertySubmissionBlocker({
            verification_status: 'approved',
            agency_verification_status: 'under_review',
            branch_name: 'Belfast',
            registered_office_address: '1 Office Street',
            complaints_contact: 'ops@example.com',
            redress_scheme_name: 'PRS',
            redress_membership_number: 'PRS-1',
            cmp_provider: '',
            cmp_certificate_url: '',
            has_client_money: false,
        }),
        'Your agency or branch verification must be approved before you can submit a property for admin approval.',
    );
});

test('blocks submission when operational broker fields are missing', () => {
    assert.equal(
        getManagerPropertySubmissionBlocker({
            verification_status: 'approved',
            agency_verification_status: 'approved',
            branch_name: '',
            registered_office_address: '',
            complaints_contact: 'ops@example.com',
            redress_scheme_name: 'PRS',
            redress_membership_number: '',
            cmp_provider: '',
            cmp_certificate_url: '',
            has_client_money: false,
        }),
        'Complete your agency profile before you submit a property for admin approval: branch name, registered office address, redress membership number.',
    );
});

test('requires CMP details when the agency holds client money', () => {
    assert.equal(
        getManagerPropertySubmissionBlocker({
            verification_status: 'approved',
            agency_verification_status: 'approved',
            branch_name: 'Belfast',
            registered_office_address: '1 Office Street',
            complaints_contact: 'ops@example.com',
            redress_scheme_name: 'PRS',
            redress_membership_number: 'PRS-1',
            cmp_provider: '',
            cmp_certificate_url: '',
            has_client_money: true,
        }),
        'Complete your agency profile before you submit a property for admin approval: client money protection provider, client money protection certificate.',
    );
});

test('allows submission once verification and operational details are complete', () => {
    assert.equal(
        getManagerPropertySubmissionBlocker({
            verification_status: 'approved',
            agency_verification_status: 'approved',
            branch_name: 'Belfast',
            registered_office_address: '1 Office Street',
            complaints_contact: 'ops@example.com',
            redress_scheme_name: 'PRS',
            redress_membership_number: 'PRS-1',
            cmp_provider: 'CMP',
            cmp_certificate_url: 'https://example.com/cmp.pdf',
            has_client_money: true,
        }),
        null,
    );
});
