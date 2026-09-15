export const validateOptionalLeadPhone = (value?: string): string | null => {
    const phone = value?.trim() || '';
    return phone && !/^[+]?[\d\s()-]+$/.test(phone)
        ? 'Phone must contain only numbers, spaces, and +()-'
        : null;
};
