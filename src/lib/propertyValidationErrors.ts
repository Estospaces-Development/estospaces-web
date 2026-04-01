const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

const PROPERTY_FIELD_ERROR_MAP: Record<string, string> = {
    price: 'priceAmount',
    address_line_1: 'addressLine1',
    postcode: 'postalCode',
    property_size_sqft: 'totalArea',
    image_urls: 'images',
    agent_name: 'contactName',
    agent_email: 'contactEmail',
    agent_phone: 'contactPhone',
};

export function isValidUkPostcode(value: string): boolean {
    return UK_POSTCODE_REGEX.test(value.trim());
}

export function mapPropertyMutationFieldErrors(
    fieldErrors?: Record<string, string> | null,
): Record<string, string> {
    if (!fieldErrors) {
        return {};
    }

    return Object.entries(fieldErrors).reduce<Record<string, string>>((mapped, [field, message]) => {
        const targetField = PROPERTY_FIELD_ERROR_MAP[field] || field;
        mapped[targetField] = message;
        return mapped;
    }, {});
}
