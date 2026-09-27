// Builds PATCH-like profile payloads for core `PUT /api/v1/users/profile`.
//
// Core treats every profile field as optional (pointer fields) and only writes
// the keys present in the body. Sending just the fields the user changed means a
// stale browser tab can no longer overwrite a field another session saved in the
// meantime (QA-MB-20260923-01-032). Two sessions editing the *same* field are
// still last-writer-wins for that field.

export const PROFILE_FIELD_WIRE_NAMES = {
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    address: 'address',
    postcode: 'postcode',
    country: 'country',
} as const;

export type ProfileFormField = keyof typeof PROFILE_FIELD_WIRE_NAMES;
export type ProfileWireField = (typeof PROFILE_FIELD_WIRE_NAMES)[ProfileFormField];
export type ProfileFormValues = Partial<Record<ProfileFormField, string>>;
export type ChangedProfileFields = Partial<Record<ProfileWireField, string>>;

export const PROFILE_ADDRESS_MAX_LENGTH = 250;

// Browsers normalise textarea values to LF, while stored values may contain CRLF.
// Normalising both sides keeps an untouched address from looking "changed".
export function normalizeProfileAddress(value: string | null | undefined): string {
    return String(value ?? '').replace(/\r\n?/g, '\n').trim();
}

export function normalizeProfileFieldValue(field: ProfileFormField, value: string | null | undefined): string {
    if (field === 'address') {
        return normalizeProfileAddress(value);
    }
    return String(value ?? '').trim();
}

export function buildChangedProfileFields(
    baseline: ProfileFormValues,
    current: ProfileFormValues,
): ChangedProfileFields {
    const changed: ChangedProfileFields = {};
    for (const field of Object.keys(PROFILE_FIELD_WIRE_NAMES) as ProfileFormField[]) {
        if (!(field in current)) {
            continue;
        }
        const nextValue = normalizeProfileFieldValue(field, current[field]);
        if (nextValue !== normalizeProfileFieldValue(field, baseline[field])) {
            changed[PROFILE_FIELD_WIRE_NAMES[field]] = nextValue;
        }
    }
    return changed;
}
