import { inferSearchMarketFromText, normalizeSearchMarketParam } from '@/lib/propertySearchControls';
import type { SupportedLaunchCountryCode } from '@/lib/launchLocale';

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
