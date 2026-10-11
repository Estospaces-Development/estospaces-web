import type { GeoMarketCode } from '@/lib/geoMarket';
import { LAUNCH_COUNTRY_CODE } from '@/lib/launchLocale';

export type ManagerVerificationProfileType = 'broker' | 'company';

export type ManagerVerificationProfileField =
    | 'companyName'
    | 'businessPhone'
    | 'companyAddress'
    | 'licenseNumber'
    | 'branchName'
    | 'registeredOfficeAddress'
    | 'complaintsContact'
    | 'redressSchemeName'
    | 'redressMembershipNumber'
    | 'cmpProvider'
    | 'cmpCertificateUrl';

export interface ManagerVerificationProfileValues {
    profileType?: ManagerVerificationProfileType;
    companyName: string;
    businessPhone: string;
    companyAddress: string;
    licenseNumber: string;
    branchName: string;
    registeredOfficeAddress: string;
    complaintsContact: string;
    redressSchemeName: string;
    redressMembershipNumber: string;
    cmpProvider: string;
    cmpCertificateUrl: string;
    hasClientMoney?: boolean;
    market?: GeoMarketCode;
}

export interface MissingManagerVerificationProfileField {
    field: ManagerVerificationProfileField;
    label: string;
}

const requiredFields: Array<MissingManagerVerificationProfileField> = [
    { field: 'companyName', label: 'Company name' },
    { field: 'businessPhone', label: 'Business phone' },
    { field: 'companyAddress', label: 'Office / company address' },
    { field: 'licenseNumber', label: 'Broker license number' },
    { field: 'branchName', label: 'Branch name' },
    { field: 'registeredOfficeAddress', label: 'Registered office address' },
    { field: 'complaintsContact', label: 'Complaints contact' },
    { field: 'redressSchemeName', label: 'Redress scheme' },
    { field: 'redressMembershipNumber', label: 'Redress membership number' },
];

export const getMissingManagerVerificationProfileFields = (
    values: ManagerVerificationProfileValues,
): MissingManagerVerificationProfileField[] => {
    const isIndia = values.market === LAUNCH_COUNTRY_CODE;
    const licenseLabel = values.profileType === 'company'
        ? 'Company registration number'
        : isIndia ? 'RERA registration number' : undefined;
    const fields = requiredFields
        .filter(({ field }) => !(isIndia && (field === 'redressSchemeName' || field === 'redressMembershipNumber')))
        .map((entry) => (
            entry.field === 'licenseNumber' && licenseLabel
                ? { ...entry, label: licenseLabel }
                : entry
        ));

    if (values.hasClientMoney) {
        fields.push(
            { field: 'cmpProvider', label: 'Client money protection provider' },
            { field: 'cmpCertificateUrl', label: 'Client money protection certificate URL' },
        );
    }

    return fields.filter(({ field }) => !values[field].trim());
};
