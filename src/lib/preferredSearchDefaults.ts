import { inferSearchMarketFromText, normalizeSearchMarketParam } from '@/lib/propertySearchControls';
import { getLaunchCountryFromLocationCode, type SupportedLaunchCountryCode } from '@/lib/launchLocale';

export interface PreferredSearchDefaults {
  market: SupportedLaunchCountryCode | null;
  location: string;
}

export function resolvePreferredSearchDefaults(preferredCity: string | null | undefined): PreferredSearchDefaults {
  const value = String(preferredCity || '').trim();
  const countryMarket = normalizeSearchMarketParam(value);
  if (countryMarket) {
    return { market: countryMarket, location: '' };
  }

  const city = value.split(',')[0]?.trim() || '';
  const cityMarket = inferSearchMarketFromText(value);
  if (cityMarket) {
    return { market: cityMarket, location: city };
  }

  return { market: null, location: '' };
}

/**
 * Country a location form should validate and price against. A recognised
 * city or country typed by the user wins over the account market, so London
 * asks for a UK postcode in GBP even on an India account. A PIN code or
 * postcode is used next, then the account market.
 */
export function resolveLocationFormMarket({
  location,
  locationCode,
  fallback,
}: {
  location?: string | null;
  locationCode?: string | null;
  fallback: SupportedLaunchCountryCode;
}): SupportedLaunchCountryCode {
  return resolvePreferredSearchDefaults(location).market
    || getLaunchCountryFromLocationCode(locationCode)
    || fallback;
}

export function getMarketCurrencyCode(market: SupportedLaunchCountryCode): 'GBP' | 'INR' {
  return market === 'GB' ? 'GBP' : 'INR';
}
