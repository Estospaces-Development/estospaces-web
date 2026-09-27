import { formatLaunchCurrencyForCountry, normalizeLaunchCurrencyText } from './launchLocale';

interface ManagerPropertyPriceInput {
    price?: { amount: number; currency?: string | null } | number | string;
    priceString?: string;
    listingType?: string | null;
    listing_type?: string | null;
    type?: string;
    countryCode?: string | null;
    country_code?: string | null;
    country?: string | null;
    currency?: string | null;
    location?: { countryCode?: string | null; country?: string | null } | string | null;
}

export const formatManagerPropertyPrice = (property: ManagerPropertyPriceInput): string | null => {
    const location = typeof property.location === 'object' ? property.location : null;
    const price = property.price;
    let formatted: string | null = null;

    if (property.priceString) {
        formatted = normalizeLaunchCurrencyText(property.priceString);
    } else if (typeof price === 'number' || (typeof price === 'object' && price !== null)) {
        const amount = typeof price === 'number' ? price : price.amount;
        // An unset price is stored as 0; never show it as a real amount.
        if (!Number.isFinite(amount) || amount <= 0) {
            return null;
        }
        formatted = formatLaunchCurrencyForCountry(amount, {
            countryCode: property.countryCode || property.country_code || property.country
                || location?.countryCode || location?.country,
            countryName: property.country || location?.country,
            currencyCode: (typeof price === 'object' ? price.currency : null) || property.currency,
        });
    } else if (typeof price === 'string' && price.trim()) {
        formatted = normalizeLaunchCurrencyText(price);
    }

    const isRental = property.listingType === 'rent' || property.listing_type === 'rent'
        || property.type?.toLowerCase() === 'rent';
    // Only real amounts get a period, never fallbacks such as "POA".
    return formatted && isRental && /\d/.test(formatted) && !/\/month$/i.test(formatted.trim())
        ? `${formatted}/month`
        : formatted;
};
