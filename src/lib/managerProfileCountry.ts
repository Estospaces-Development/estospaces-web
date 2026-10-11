import { LAUNCH_COUNTRY_NAME, UK_COUNTRY_NAME } from './launchLocale';

// The two launch markets. Core stores and accepts exactly these names.
export const MANAGER_PROFILE_COUNTRIES = [LAUNCH_COUNTRY_NAME, UK_COUNTRY_NAME] as const;

export const MANAGER_COUNTRY_LOCKED_HINT = 'Contact support to change your country';

const COUNTRY_BY_KEY: Record<string, string> = {
    india: LAUNCH_COUNTRY_NAME,
    in: LAUNCH_COUNTRY_NAME,
    'united kingdom': UK_COUNTRY_NAME,
    uk: UK_COUNTRY_NAME,
    gb: UK_COUNTRY_NAME,
};

type CountrySource = {
    country?: unknown;
    countryCode?: unknown;
    country_code?: unknown;
    user_metadata?: Record<string, unknown> | null;
} | null | undefined;

// The stored country as one of the two supported names, or '' when unset or
// unsupported (never a guess). Mirrors the sources isIndiaComplianceUser reads.
export const resolveManagerProfileCountry = (user: CountrySource): string => {
    const metadata = user?.user_metadata || {};
    const candidates = [user?.country, metadata.country, user?.countryCode, user?.country_code, metadata.countryCode, metadata.country_code];
    for (const candidate of candidates) {
        const match = COUNTRY_BY_KEY[String(candidate ?? '').trim().toLowerCase()];
        if (match) {
            return match;
        }
    }
    return '';
};

// Core refuses a country change after verification (409) and rejects unsupported
// values (400); both messages name the country, other failures do not.
export const isManagerCountryRefusal = (message: string): boolean => /country/i.test(message || '');
