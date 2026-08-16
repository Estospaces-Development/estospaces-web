import {
  formatLaunchCurrency,
  formatLaunchCurrencyForCountry,
  LAUNCH_CURRENCY_CODE,
} from '@/lib/launchLocale';

export interface MapPropertyCurrencyContext {
  price?: number | null;
  currency?: string | null;
  country?: string | null;
  countryCode?: string | null;
  country_code?: string | null;
}

export const formatMapPropertyPrice = (
  property?: MapPropertyCurrencyContext | null,
  fallback = 'Price unavailable',
) => {
  if (typeof property?.price !== 'number' || !Number.isFinite(property.price) || property.price <= 0) {
    return fallback;
  }

  return formatLaunchCurrencyForCountry(property.price, {
    countryCode: property?.countryCode || property?.country_code,
    countryName: property?.country,
    currencyCode: property?.currency,
  });
};

export const formatMapPriceInRupees = (
  amount: number | null | undefined,
  fallback = 'Price unavailable',
): string => {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return fallback;
  }

  return formatLaunchCurrency(amount, { currencyCode: LAUNCH_CURRENCY_CODE });
};
