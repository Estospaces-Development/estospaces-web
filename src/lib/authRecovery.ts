const MAX_EMAIL_LENGTH = 254;

export function normalizeRecoveryEmail(value: string): string {
    return value.trim().toLowerCase();
}

export function validateRecoveryEmail(value: string): string {
    const normalizedEmail = normalizeRecoveryEmail(value);

    if (!normalizedEmail) {
        return 'Email is required';
    }
    if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
        return 'Email must be 254 characters or fewer';
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return 'Enter a valid email';
    }

    return '';
}
