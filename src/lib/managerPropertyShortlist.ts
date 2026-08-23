export interface ManagerPortfolioProperty {
    id: string;
    title: string;
    city?: string;
    postcode?: string;
    country?: string;
    currency?: string;
    price?: number;
    listing_type?: string;
    image_urls?: string;
}

type PropertySort = 'price_desc' | 'price_asc' | 'title_asc';

const normalizeListingType = (value?: string) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

export const isPortfolioPropertyEligibleForRequest = (
    property: ManagerPortfolioProperty,
    requestType?: string,
) => {
    const normalizedRequestType = normalizeListingType(requestType);
    const normalizedListingType = normalizeListingType(property.listing_type);

    if (normalizedRequestType === 'buy') {
        return ['sale', 'buy', 'for_sale'].includes(normalizedListingType);
    }
    if (normalizedRequestType === 'rent') {
        return ['rent', 'rental', 'for_rent'].includes(normalizedListingType);
    }
    return true;
};

export const selectShareablePortfolioProperties = (
    properties: ManagerPortfolioProperty[],
    options: {
        requestType?: string;
        search?: string;
        sort: PropertySort;
        limit?: number;
    },
) => {
    const search = String(options.search || '').trim().toLowerCase();
    const filtered = properties.filter((property) => {
        if (!isPortfolioPropertyEligibleForRequest(property, options.requestType)) {
            return false;
        }
        if (!search) {
            return true;
        }
        return [property.title, property.city, property.postcode, property.listing_type]
            .some((value) => String(value || '').toLowerCase().includes(search));
    });

    filtered.sort((left, right) => {
        if (options.sort === 'price_asc') {
            return (left.price || 0) - (right.price || 0);
        }
        if (options.sort === 'title_asc') {
            return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
        }
        return (right.price || 0) - (left.price || 0);
    });

    return typeof options.limit === 'number' ? filtered.slice(0, options.limit) : filtered;
};
