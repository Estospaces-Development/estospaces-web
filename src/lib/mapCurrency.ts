import { formatLaunchCurrency, LAUNCH_CURRENCY_CODE } from '@/lib/launchLocale';

export const formatMapPriceInRupees = (
  amount: number | null | undefined,
  fallback = 'Price unavailable',
): string => {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return fallback;
  }

  return formatLaunchCurrency(amount, { currencyCode: LAUNCH_CURRENCY_CODE });
};
