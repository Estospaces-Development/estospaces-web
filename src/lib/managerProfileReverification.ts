import type { ManagerProfile } from '@/services/managerVerificationService';

/**
 * Mirrors core `brokerVerificationFieldsChanged` and `requiresBrokerReverification`
 * (estospaces-core-service internal/leads/service.go). Core compares each
 * submitted value exactly with the stored value, so formatting-only
 * differences (for example trimmed whitespace) also trigger re-verification.
 * Keep this list in step with core; it must never omit a core trigger.
 */
type StringTriggerField =
    | 'company_name'
    | 'branch_name'
    | 'company_registration_number'
    | 'business_phone'
    | 'company_address'
    | 'registered_office_address'
    | 'complaints_contact'
    | 'redress_scheme_name'
    | 'redress_membership_number'
    | 'cmp_provider'
    | 'cmp_certificate_url'
    | 'license_expiry_date'
    | 'association_membership_id'
    | 'tax_id'
    | 'authorized_representative_name'
    | 'authorized_representative_email';

type BooleanTriggerField =
    | 'has_ombudsman'
    | 'has_insurance'
    | 'has_client_money'
    | 'arla_member'
    | 'naea_member'
    | 'rics_member';

const STRING_TRIGGER_LABELS: Record<StringTriggerField, string> = {
    company_name: 'Company name',
    branch_name: 'Branch name',
    company_registration_number: 'License / registration number',
    business_phone: 'Business phone',
    company_address: 'Company address',
    registered_office_address: 'Registered office address',
    complaints_contact: 'Complaints contact',
    redress_scheme_name: 'Redress scheme',
    redress_membership_number: 'Redress membership number',
    cmp_provider: 'Client money protection provider',
    cmp_certificate_url: 'Client money protection certificate URL',
    license_expiry_date: 'License expiry date',
    association_membership_id: 'Association membership ID',
    tax_id: 'Tax ID',
    authorized_representative_name: 'Authorised representative name',
    authorized_representative_email: 'Authorised representative email',
};

const BOOLEAN_TRIGGER_LABELS: Record<BooleanTriggerField, string> = {
    has_ombudsman: 'Ombudsman membership',
    has_insurance: 'Insurance cover',
    has_client_money: 'Client money handling',
    arla_member: 'ARLA membership',
    naea_member: 'NAEA membership',
    rics_member: 'RICS membership',
};

const normalizeProfileType = (value?: string | null) => (value === 'company' ? 'company' : 'broker');

/** The value core has stored, reconstructed from the mapped profile. */
const storedString = (profile: ManagerProfile, field: StringTriggerField): string => {
    if (field === 'company_name') {
        return profile.persisted_company_name ?? profile.company_name ?? '';
    }
    if (field === 'company_registration_number') {
        return profile.company_registration_number ?? profile.license_number ?? '';
    }
    return profile[field] ?? '';
};

/** The value the profile service will send for this field, or undefined when it is omitted. */
const submittedString = (payload: Partial<ManagerProfile>, field: StringTriggerField): string | undefined => {
    if (field === 'company_registration_number') {
        return payload.company_registration_number !== undefined || payload.license_number !== undefined
            ? (payload.company_registration_number || payload.license_number || '')
            : undefined;
    }
    return payload[field];
};

const storedBoolean = (profile: ManagerProfile, field: BooleanTriggerField): boolean => (
    field === 'has_client_money' && profile.persisted_has_client_money !== undefined
        ? profile.persisted_has_client_money
        : Boolean(profile[field])
);

/**
 * Returns the labels of the fields in `payload` that will move a verified
 * manager back to `verification_required` when saved. Empty when the manager is
 * not currently verified or nothing verification-sensitive changes.
 */
export function getReverificationTriggerFields(
    profile: ManagerProfile | null | undefined,
    payload: Partial<ManagerProfile> | null | undefined,
): string[] {
    if (!profile || !payload || profile.verification_status !== 'approved') {
        return [];
    }

    const changed: string[] = [];
    if (payload.profile_type !== undefined
        && normalizeProfileType(payload.profile_type) !== normalizeProfileType(profile.profile_type)) {
        changed.push('Profile type');
    }

    for (const field of Object.keys(STRING_TRIGGER_LABELS) as StringTriggerField[]) {
        const submitted = submittedString(payload, field);
        if (submitted !== undefined && submitted !== storedString(profile, field)) {
            changed.push(STRING_TRIGGER_LABELS[field]);
        }
    }

    for (const field of Object.keys(BOOLEAN_TRIGGER_LABELS) as BooleanTriggerField[]) {
        const submitted = payload[field];
        if (submitted !== undefined && Boolean(submitted) !== storedBoolean(profile, field)) {
            changed.push(BOOLEAN_TRIGGER_LABELS[field]);
        }
    }

    return changed;
}

export const formatReverificationWarning = (fields: string[]): string => {
    const subject = fields.length === 1
        ? fields[0]
        : `${fields.slice(0, -1).join(', ')} and ${fields[fields.length - 1]}`;
    return `Changing ${subject} will require re-verification. Until an admin approves your profile again, you lose verified status, new Fast Track cases pause and subscription checkout is unavailable. Existing Fast Track cases, appointments and contracts stay open and you can keep working on them. Changing the value back later does not restore verification.`;
};
