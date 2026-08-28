import {
  getSupportedLaunchCountry,
  type SupportedLaunchCountryCode,
} from '@/lib/launchLocale';

export interface MarketScopedProperty {
  country?: string | null;
  countryCode?: string | null;
  country_code?: string | null;
  postcode?: string | null;
  postalCode?: string | null;
  zipCode?: string | null;
  location?: unknown;
  city?: string | null;
}

const LOCATION_CODE_PATTERN = /\b(?:\d{6}|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i;

const getStructuredLocation = (property: MarketScopedProperty) => (
  property.location && typeof property.location === 'object'
    ? property.location as Record<string, unknown>
    : {}
);

const getLocationText = (value: unknown): string => (
  typeof value === 'string' ? value.trim() : ''
);

const getLocationCodeFromProperty = (property: MarketScopedProperty): string => {
  const location = getStructuredLocation(property);
  const directPostcode = [
    property.postcode,
    property.postalCode,
    property.zipCode,
    location.postcode,
    location.postalCode,
    location.zipCode,
  ].map(getLocationText).find(Boolean) || '';
  if (directPostcode) {
    return directPostcode;
  }

  const locationText = [
    typeof property.location === 'string' ? property.location : '',
    property.city,
    location.city,
  ]
    .map(getLocationText)
    .filter(Boolean)
    .join(' ');
  return locationText.match(LOCATION_CODE_PATTERN)?.[0] || '';
};

export const getPropertyMarket = (
  property: MarketScopedProperty,
): SupportedLaunchCountryCode | null => {
  const location = getStructuredLocation(property);
  const topLevelCountryCode = getLocationText(property.countryCode)
    || getLocationText(property.country_code);
  if (topLevelCountryCode) {
    return getSupportedLaunchCountry(topLevelCountryCode);
  }

  const topLevelCountryName = getLocationText(property.country);
  if (topLevelCountryName) {
    return getSupportedLaunchCountry(topLevelCountryName, topLevelCountryName);
  }

  const nestedCountryCode = getLocationText(location.countryCode)
    || getLocationText(location.country_code);
  if (nestedCountryCode) {
    return getSupportedLaunchCountry(nestedCountryCode);
  }

  const nestedCountryName = getLocationText(location.country);
  if (nestedCountryName) {
    return getSupportedLaunchCountry(nestedCountryName, nestedCountryName);
  }

  return getSupportedLaunchCountry(undefined, undefined, getLocationCodeFromProperty(property));
};

/**
 * User-facing inventory must stay inside the signed-in user's market. Unknown
 * country metadata is excluded rather than guessed, so a listing can never
 * cross a country boundary while its location data is incomplete.
 */
export const isPropertyInMarket = (
  property: MarketScopedProperty,
  market: SupportedLaunchCountryCode,
): boolean => getPropertyMarket(property) === market;

export const filterPropertiesForMarket = <T extends MarketScopedProperty>(
  properties: readonly T[],
  market: SupportedLaunchCountryCode,
): T[] => properties.filter((property) => isPropertyInMarket(property, market));
