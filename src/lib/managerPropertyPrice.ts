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
        formatted = formatLaunchCurrencyForCountry(typeof price === 'number' ? price : price.amount, {
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
    return formatted && isRental && !/\/month$/i.test(formatted.trim())
        ? `${formatted}/month`
        : formatted;
};
