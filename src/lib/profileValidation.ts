const MAX_NAME_LENGTH = 80;
const MAX_FULL_NAME_LENGTH = 160;

export type ProfileNameField = 'firstName' | 'lastName';

export type ProfileNameErrors = Partial<Record<ProfileNameField, string>>;

function validateProfileName(label: string, value: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
        return `${label} is required`;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
        return `${label} must be ${MAX_NAME_LENGTH} characters or fewer`;
    }

    return '';
}

export function validateProfileNameFields(values: { firstName: string; lastName: string }): ProfileNameErrors {
    const errors: ProfileNameErrors = {};
    const firstNameError = validateProfileName('First name', values.firstName);
    const lastNameError = validateProfileName('Last name', values.lastName);

    if (firstNameError) {
        errors.firstName = firstNameError;
    }
    if (lastNameError) {
        errors.lastName = lastNameError;
    }

    return errors;
}

export function validateFullName(value: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
        return 'Full name is required';
    }
    if (trimmed.length > MAX_FULL_NAME_LENGTH) {
        return `Full name must be ${MAX_FULL_NAME_LENGTH} characters or fewer`;
    }

    return '';
}
