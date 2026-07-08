export const propertyTypes = [
    { value: '', label: 'All Types' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'villa', label: 'Villa' },
    { value: 'studio', label: 'Studio' },
    { value: 'penthouse', label: 'Penthouse' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'office', label: 'Office' },
    { value: 'land', label: 'Land' },
];

const transactionTypeValues = new Set(['buy', 'rent', 'sale', 'sold']);

const formatPropertyTypeLabel = (value: string) => value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const buildPropertyTypeOptions = (apiPropertyTypes?: string[]) => {
    const apiTypes = apiPropertyTypes?.length
        ? apiPropertyTypes.map((value) => ({ value: value.trim(), label: formatPropertyTypeLabel(value) }))
        : [];
    const source = [...propertyTypes.slice(1), ...apiTypes];
    const seenValues = new Set<string>();
    const filtered = source.filter((type) => {
        const value = type.value.trim();
        const normalizedValue = value.toLowerCase();
        if (!value || transactionTypeValues.has(normalizedValue) || seenValues.has(normalizedValue)) {
            return false;
        }
        seenValues.add(normalizedValue);
        return true;
    });

    return [{ value: '', label: 'All Types' }, ...filtered];
};
