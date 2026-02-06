/**
 * Currency Utilities
 * Handles currency conversion and formatting for international properties
 */

export type CurrencyCode = 'GBP' | 'EUR' | 'USD' | 'AED' | 'INR' | 'AUD' | 'CAD' | 'CHF';

// Exchange rates relative to GBP (British Pound)
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  GBP: 1,
  EUR: 1.17,
  USD: 1.27,
  AED: 4.66,
  INR: 106.5,
  AUD: 1.94,
  CAD: 1.71,
  CHF: 1.11,
};

// Currency symbols
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
  AED: 'د.إ',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
};

// Currency names
const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  GBP: 'British Pound',
  EUR: 'Euro',
  USD: 'US Dollar',
  AED: 'UAE Dirham',
  INR: 'Indian Rupee',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
};

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  if (!amount || !fromCurrency || !toCurrency) return amount;

  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;

  // Convert to GBP first, then to target currency
  const gbpAmount = amount / fromRate;
  const convertedAmount = gbpAmount * toRate;

  return convertedAmount;
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: CurrencyCode = 'GBP',
  showCode = false
): string {
  if (amount === null || amount === undefined) return '';

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  if (showCode) {
    return `${symbol}${formatted} ${currency}`;
  }

  return `${symbol}${formatted}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Get currency name
 */
export function getCurrencyName(currency: CurrencyCode): string {
  return CURRENCY_NAMES[currency] || currency;
}

/**
 * Get all supported currencies
 */
export function getAllCurrencies() {
  return Object.keys(CURRENCY_SYMBOLS).map((code) => ({
    code: code as CurrencyCode,
    symbol: CURRENCY_SYMBOLS[code as CurrencyCode],
    name: CURRENCY_NAMES[code as CurrencyCode],
    rate: EXCHANGE_RATES[code as CurrencyCode],
  }));
}

/**
 * Format price range with currency
 */
export function formatPriceRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: CurrencyCode = 'GBP'
): string {
  if (!min && !max) return '';
  if (!max) return `From ${formatCurrency(min, currency)}`;
  if (!min) return `Up to ${formatCurrency(max, currency)}`;
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
}
