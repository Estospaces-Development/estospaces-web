export type AdminPropertyRegistryProperty = {
    id?: string;
    title?: string;
    city?: string;
    location?: {
        city?: string;
    };
    listingType?: string;
    propertyType?: string;
    status?: string;
    contactName?: string;
    createdAt?: string;
    updatedAt?: string;
    price?: {
        amount?: number;
    };
    priceString?: string;
};

export type AdminPropertyRegistryFilters = {
    searchQuery?: string;
    typeFilter?: string;
    statusFilter?: string;
};

export type AdminPropertyRegistrySortOption = 'newest' | 'oldest' | 'title_asc' | 'price_desc' | 'status';

export const ADMIN_PROPERTY_TYPE_FILTERS = [
    { value: 'all', label: 'all' },
    { value: 'sale', label: 'sale' },
    { value: 'rent', label: 'rent' },
    { value: 'commercial', label: 'commercial' },
] as const;

export const ADMIN_PROPERTY_STATUS_FILTERS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'available', label: 'Available' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'sold', label: 'Sold' },
    { value: 'rented', label: 'Rented' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'off_market', label: 'Off Market' },
    { value: 'coming_soon', label: 'Coming Soon' },
] as const;

export const ADMIN_PROPERTY_SORT_OPTIONS: readonly { value: AdminPropertyRegistrySortOption; label: string }[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'title_asc', label: 'Title A-Z' },
    { value: 'price_desc', label: 'Highest price' },
    { value: 'status', label: 'Status' },
] as const;

export function getAdminPropertySortControlLabel(): string {
    return 'Sort properties';
}

const STATUS_FILTER_GROUPS: Record<string, readonly string[]> = {
    available: ['available', 'published', 'online', 'active'],
    draft: ['draft'],
    pending: ['pending', 'pending_approval', 'under_offer', 'under_contract'],
    sold: ['sold'],
    rented: ['rented', 'let'],
    suspended: ['suspended'],
    rejected: ['rejected'],
    off_market: ['off_market', 'offline'],
    coming_soon: ['coming_soon'],
};

const normalizeFilterToken = (value?: string | null) => value?.trim().toLowerCase() || 'all';

const normalizePropertyValue = (value?: string | null) => value?.trim().toLowerCase() || '';

const getPropertyTimestamp = (property: AdminPropertyRegistryProperty) =>
    new Date(property.updatedAt || property.createdAt || 0).getTime();

const getPropertyPriceAmount = (property: AdminPropertyRegistryProperty) => {
    if (typeof property.price?.amount === 'number') {
        return property.price.amount;
    }

    const parsed = Number.parseFloat(String(property.priceString || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const matchesSearch = (property: AdminPropertyRegistryProperty, searchQuery?: string) => {
    const normalizedQuery = normalizePropertyValue(searchQuery);

    if (!normalizedQuery) {
        return true;
    }

    return [
        property.title,
        property.city,
        property.location?.city,
        property.status,
        property.contactName,
    ].some((value) => normalizePropertyValue(value).includes(normalizedQuery));
};

const matchesTypeFilter = (property: AdminPropertyRegistryProperty, typeFilter?: string) => {
    switch (normalizeFilterToken(typeFilter)) {
        case 'sale':
            return normalizePropertyValue(property.listingType) === 'sale';
        case 'rent':
            return normalizePropertyValue(property.listingType) === 'rent';
        case 'commercial':
            return normalizePropertyValue(property.propertyType) === 'commercial';
        default:
            return true;
    }
};

const matchesStatusFilter = (property: AdminPropertyRegistryProperty, statusFilter?: string) => {
    const normalizedFilter = normalizeFilterToken(statusFilter);

    if (normalizedFilter === 'all') {
        return true;
    }

    const matchingStatuses = STATUS_FILTER_GROUPS[normalizedFilter] || [normalizedFilter];
    return matchingStatuses.includes(normalizePropertyValue(property.status));
};

export const filterAdminPropertyRegistry = <Property extends AdminPropertyRegistryProperty>(
    properties: readonly Property[],
    filters: AdminPropertyRegistryFilters,
) => properties.filter((property) => (
    matchesSearch(property, filters.searchQuery)
    && matchesTypeFilter(property, filters.typeFilter)
    && matchesStatusFilter(property, filters.statusFilter)
));

export const sortAdminPropertyRegistry = <Property extends AdminPropertyRegistryProperty>(
    properties: readonly Property[],
    sortBy: AdminPropertyRegistrySortOption,
) => {
    const sorted = [...properties];
    const byTitle = (left: Property, right: Property) =>
        normalizePropertyValue(left.title).localeCompare(normalizePropertyValue(right.title), undefined, { sensitivity: 'base' });
    const byDate = (left: Property, right: Property) => getPropertyTimestamp(left) - getPropertyTimestamp(right);

    switch (sortBy) {
        case 'oldest':
            return sorted.sort(byDate);
        case 'title_asc':
            return sorted.sort(byTitle);
        case 'price_desc':
            return sorted.sort((left, right) => getPropertyPriceAmount(right) - getPropertyPriceAmount(left));
        case 'status':
            return sorted.sort((left, right) => {
                const statusComparison = normalizePropertyValue(left.status).localeCompare(
                    normalizePropertyValue(right.status),
                    undefined,
                    { sensitivity: 'base' },
                );
                return statusComparison || byTitle(left, right);
            });
        default:
            return sorted.sort((left, right) => byDate(right, left));
    }
};
