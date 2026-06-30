export interface PreferencesValidationInput {
    preferred_type: string;
    min_budget: number | null;
    max_budget: number | null;
    min_bedrooms: number | null;
    max_bedrooms: number | null;
    search_radius_km: number | null;
}

export type PreferencesValidationErrors = Partial<Record<keyof PreferencesValidationInput, string>>;

const MAX_PREFERENCE_BUDGET = 100000000;
const MAX_PREFERENCE_BEDROOMS = 20;
const MAX_SEARCH_RADIUS_KM = 500;

function addNonNegativeError(
    errors: PreferencesValidationErrors,
    key: keyof PreferencesValidationInput,
    label: string,
    value: number | null,
    maxValue?: number,
    maxLabel?: string,
) {
    if (value !== null && !Number.isFinite(value)) {
        errors[key] = `${label} must be a valid number`;
        return;
    }
    if (value !== null && value < 0) {
        errors[key] = `${label} must be zero or greater`;
        return;
    }
    if (value !== null && maxValue !== undefined && value > maxValue) {
        errors[key] = `${label} must be ${maxLabel || `${maxValue} or less`}`;
    }
}

export function validateUserPreferences(values: PreferencesValidationInput): PreferencesValidationErrors {
    const errors: PreferencesValidationErrors = {};
    const preferredType = values.preferred_type.trim().toLowerCase();

    if (preferredType && preferredType !== 'rent' && preferredType !== 'sale') {
        errors.preferred_type = 'Preferred listing type must be rent, sale, or no default';
    }

    addNonNegativeError(errors, 'min_budget', 'Minimum budget', values.min_budget, MAX_PREFERENCE_BUDGET);
    addNonNegativeError(errors, 'max_budget', 'Maximum budget', values.max_budget, MAX_PREFERENCE_BUDGET);
    addNonNegativeError(errors, 'min_bedrooms', 'Minimum bedrooms', values.min_bedrooms, MAX_PREFERENCE_BEDROOMS, `${MAX_PREFERENCE_BEDROOMS} or fewer`);
    addNonNegativeError(errors, 'max_bedrooms', 'Maximum bedrooms', values.max_bedrooms, MAX_PREFERENCE_BEDROOMS, `${MAX_PREFERENCE_BEDROOMS} or fewer`);
    addNonNegativeError(errors, 'search_radius_km', 'Search radius', values.search_radius_km, MAX_SEARCH_RADIUS_KM, `${MAX_SEARCH_RADIUS_KM} km or less`);

    if (
        values.min_budget !== null &&
        values.max_budget !== null &&
        values.min_budget >= 0 &&
        values.max_budget >= 0 &&
        values.min_budget > values.max_budget
    ) {
        errors.max_budget = 'Maximum budget must be greater than or equal to minimum budget';
    }

    if (
        values.min_bedrooms !== null &&
        values.max_bedrooms !== null &&
        values.min_bedrooms >= 0 &&
        values.max_bedrooms >= 0 &&
        values.min_bedrooms > values.max_bedrooms
    ) {
        errors.max_bedrooms = 'Maximum bedrooms must be greater than or equal to minimum bedrooms';
    }

    return errors;
}
