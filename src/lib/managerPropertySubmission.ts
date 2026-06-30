import {
    isPlaceholderManagerCompanyName,
    type ManagerProfile,
    type VerificationStatus,
} from '@/services/managerVerificationService';

type ManagerPropertySubmissionProfile = Partial<Pick<
    ManagerProfile,
    | 'verification_status'
    | 'agency_verification_status'
    | 'profile_type'
    | 'company_name'
    | 'business_phone'
    | 'company_address'
    | 'license_number'
    | 'company_registration_number'
    | 'branch_name'
    | 'registered_office_address'
    | 'complaints_contact'
    | 'redress_scheme_name'
    | 'redress_membership_number'
    | 'cmp_provider'
    | 'cmp_certificate_url'
    | 'has_client_money'
>>;

function isApprovedVerificationStatus(status?: VerificationStatus) {
    return status === 'approved';
}

function getMissingOperationalProfileFields(profile: ManagerPropertySubmissionProfile) {
    const missing: string[] = [];

    if (!profile.branch_name?.trim()) {
        missing.push('branch name');
    }
    if (!profile.registered_office_address?.trim()) {
        missing.push('registered office address');
    }
    if (!profile.complaints_contact?.trim()) {
        missing.push('complaints contact');
    }
    if (!profile.redress_scheme_name?.trim()) {
        missing.push('redress scheme name');
    }
    if (!profile.redress_membership_number?.trim()) {
        missing.push('redress membership number');
    }
    if (profile.has_client_money) {
        if (!profile.cmp_provider?.trim()) {
            missing.push('client money protection provider');
        }
        if (!profile.cmp_certificate_url?.trim()) {
            missing.push('client money protection certificate');
        }
    }

    return missing;
}

function getMissingProfessionalProfileFields(profile: ManagerPropertySubmissionProfile) {
    const missing: string[] = [];
    const licenseNumber = profile.company_registration_number?.trim() || profile.license_number?.trim() || '';

    if (!profile.company_name?.trim() || isPlaceholderManagerCompanyName(profile.company_name)) {
        missing.push('company name');
    }
    if (!profile.business_phone?.trim()) {
        missing.push('business phone');
    }
    if (!profile.company_address?.trim()) {
        missing.push('company address');
    }
    if (!licenseNumber) {
        missing.push(profile.profile_type === 'company' ? 'company registration number' : 'broker license number');
    }

    return missing;
}

export function getManagerPropertySubmissionBlocker(
    profile: ManagerPropertySubmissionProfile | null | undefined,
): string | null {
    if (!profile) {
        return 'Complete your manager verification before you submit a property for admin approval.';
    }

    if (!isApprovedVerificationStatus(profile.verification_status)) {
        return 'Your manager verification must be approved before you can submit a property for admin approval.';
    }

    if (profile.agency_verification_status && !isApprovedVerificationStatus(profile.agency_verification_status)) {
        return 'Your agency or branch verification must be approved before you can submit a property for admin approval.';
    }

    const missingProfessionalFields = getMissingProfessionalProfileFields(profile);
    if (missingProfessionalFields.length > 0) {
        return `Complete your professional profile before you submit a property for admin approval: ${missingProfessionalFields.join(', ')}.`;
    }

    const missing = getMissingOperationalProfileFields(profile);
    if (missing.length > 0) {
        return `Complete your agency profile before you submit a property for admin approval: ${missing.join(', ')}.`;
    }

    return null;
}
