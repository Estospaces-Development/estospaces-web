import {
  getSupportedLaunchCountry,
  type SupportedLaunchCountryCode,
} from '@/lib/launchLocale';

export interface MarketScopedProperty {
  country?: string | null;
  countryCode?: string | null;
  country_code?: string | null;
  postcode?: string | null;
  location?: string | null;
  city?: string | null;
}

const LOCATION_CODE_PATTERN = /\b(?:\d{6}|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i;

const getLocationCodeFromProperty = (property: MarketScopedProperty): string => {
  const directPostcode = String(property.postcode || '').trim();
  if (directPostcode) {
    return directPostcode;
  }

  const locationText = [property.location, property.city]
    .filter(Boolean)
    .join(' ');
  return locationText.match(LOCATION_CODE_PATTERN)?.[0] || '';
};

export const getPropertyMarket = (
  property: MarketScopedProperty,
): SupportedLaunchCountryCode | null => getSupportedLaunchCountry(
  property.countryCode || property.country_code,
  property.country,
  getLocationCodeFromProperty(property),
);

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
