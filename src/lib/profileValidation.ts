const MAX_NAME_LENGTH = 80;
const MAX_FULL_NAME_LENGTH = 160;
const MAX_PHONE_LENGTH = 20;
const MIN_PHONE_DIGITS = 7;

export type ProfileNameField = 'firstName' | 'lastName';

export type ProfileNameErrors = Partial<Record<ProfileNameField, string>>;

const PHONE_PATTERN = /^[+]?[-0-9 ()]*$/;

export type PhoneValidationError = string | undefined;

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

export function validatePhoneInput(phone: string): PhoneValidationError {
    const raw = phone.trim();
    if (!raw) return undefined; // optional field, no error when empty

    if (!PHONE_PATTERN.test(raw)) {
        return 'Phone number can only contain digits, spaces, parentheses, and a leading +';
    }

    const digitCount = (raw.match(/\d/g) || []).length;
    if (digitCount < MIN_PHONE_DIGITS) {
        return `Phone number must have at least ${MIN_PHONE_DIGITS} digits`;
    }
    if (raw.length > MAX_PHONE_LENGTH) {
        return `Phone number must be ${MAX_PHONE_LENGTH} characters or fewer`;
    }

    return undefined;
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
