import {
    normalizeManagerServiceAreas,
    type ManagerProfile,
    type ManagerProfileType,
} from '@/services/managerVerificationService';

interface ManagerProfileSyncInput {
    profileType?: ManagerProfileType;
    fallbackFullName: string;
    companyName: string;
    branchName: string;
    bio: string;
    licenseNumber: string;
    businessPhone: string;
    personalPhone: string;
    companyAddress: string;
    personalAddress: string;
    registeredOfficeAddress: string;
    serviceAreas: string;
    dispatchPincodes: string;
    complaintsContact: string;
    redressSchemeName: string;
    redressMembershipNumber: string;
    cmpProvider: string;
    cmpCertificateUrl: string;
    taxId: string;
}

const trimmed = (value: string): string => value.trim();

export const buildManagerProfileSyncPayload = ({
    profileType = 'broker',
    fallbackFullName,
    companyName,
    branchName,
    bio,
    licenseNumber,
    businessPhone,
    personalPhone,
    companyAddress,
    personalAddress,
    registeredOfficeAddress,
    serviceAreas,
    dispatchPincodes,
    complaintsContact,
    redressSchemeName,
    redressMembershipNumber,
    cmpProvider,
    cmpCertificateUrl,
    taxId,
}: ManagerProfileSyncInput): Partial<ManagerProfile> => {
    const resolvedCompanyName = trimmed(companyName)
        || (profileType === 'broker' ? trimmed(fallbackFullName) : '');
    const resolvedCompanyAddress = trimmed(companyAddress) || trimmed(personalAddress);

    return {
        profile_type: profileType,
        company_name: resolvedCompanyName,
        branch_name: trimmed(branchName),
        company_description: trimmed(bio),
        company_registration_number: trimmed(licenseNumber),
        business_phone: trimmed(businessPhone) || trimmed(personalPhone),
        company_address: resolvedCompanyAddress,
        registered_office_address: trimmed(registeredOfficeAddress) || resolvedCompanyAddress,
        service_areas: normalizeManagerServiceAreas(serviceAreas),
        dispatch_pincodes: normalizeManagerServiceAreas(dispatchPincodes),
        complaints_contact: trimmed(complaintsContact),
        redress_scheme_name: trimmed(redressSchemeName),
        redress_membership_number: trimmed(redressMembershipNumber),
        cmp_provider: trimmed(cmpProvider),
        cmp_certificate_url: trimmed(cmpCertificateUrl),
        tax_id: trimmed(taxId),
    };
};
