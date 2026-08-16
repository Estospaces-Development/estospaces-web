import { formatPropertyStatusLabel } from './propertyStatusBadge';

export type AdminPropertyRegistryProperty = {
    id?: string;
    propertyId?: string;
    property_id?: string;
    title?: string;
    description?: string;
    city?: string;
    location?: {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        postalCode?: string;
        country?: string;
    };
    listingType?: string;
    listing_type?: string;
    propertyType?: string;
    property_type?: string;
    status?: string;
    contactName?: string;
    agent_name?: string;
    address_line_1?: string;
    address_line_2?: string;
    postcode?: string;
    country?: string;
    bedrooms?: number;
    bathrooms?: number;
    rooms?: {
        bedrooms?: number;
        bathrooms?: number;
    };
    createdAt?: string;
    updatedAt?: string;
    price?: number | {
        amount?: number;
    };
    priceString?: string;
};

export const ADMIN_PROPERTY_AWAITING_MANAGER_SUBMISSION_LABEL = 'Awaiting Manager Submission';

export type AdminPropertyRegistryFilters = {
    searchQuery?: string;
    typeFilter?: string;
    statusFilter?: string;
};

export type AdminPropertyRegistryServiceFilters = {
    search?: string;
    listingType?: Array<'sale' | 'rent'>;
    propertyType?: Array<'commercial'>;
    status?: string[];
};

export type AdminPropertyRegistrySortOption = 'newest' | 'oldest' | 'title_asc' | 'price_desc' | 'status';

export interface AdminPropertyRegistryServiceSort {
    field: 'createdAt' | 'title' | 'price' | 'status';
    order: 'asc' | 'desc';
}

export const buildAdminPropertyRegistryServiceSort = (
    sortBy: AdminPropertyRegistrySortOption,
): AdminPropertyRegistryServiceSort => {
    switch (sortBy) {
        case 'oldest':
            return { field: 'createdAt', order: 'asc' };
        case 'title_asc':
            return { field: 'title', order: 'asc' };
        case 'price_desc':
            return { field: 'price', order: 'desc' };
        case 'status':
            return { field: 'status', order: 'asc' };
        default:
            return { field: 'createdAt', order: 'desc' };
    }
};

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

export const buildAdminPropertyRegistryServiceFilters = ({
    searchQuery,
    typeFilter,
    statusFilter,
}: AdminPropertyRegistryFilters): AdminPropertyRegistryServiceFilters => {
    const serviceFilters: AdminPropertyRegistryServiceFilters = {};
    const normalizedType = normalizeFilterToken(typeFilter);
    const normalizedStatus = normalizeFilterToken(statusFilter);
    const normalizedSearch = searchQuery?.trim();

    if (normalizedSearch) {
        serviceFilters.search = normalizedSearch;
    }

    if (normalizedType === 'sale' || normalizedType === 'rent') {
        serviceFilters.listingType = [normalizedType];
    } else if (normalizedType === 'commercial') {
        serviceFilters.propertyType = ['commercial'];
    }
    if (normalizedStatus !== 'all') {
        serviceFilters.status = [...(STATUS_FILTER_GROUPS[normalizedStatus] || [normalizedStatus])];
    }

    return serviceFilters;
};

const normalizeFilterToken = (value?: string | null) => value?.trim().toLowerCase() || 'all';

const normalizePropertyValue = (value?: string | null) => value?.trim().toLowerCase() || '';

const INTERNAL_AUTOMATION_TEXT_PATTERNS = [
    /\bqa\b/i,
    /\bcodex\b/i,
    /\bdev smoke\b/i,
    /\bsmoke test\b/i,
    /\be2e\b/i,
    /\bissue\d+\b/i,
    /\btest\b/i,
] as const;

const RAW_AUTOMATION_TIMESTAMP_PATTERNS = [
    /\b20\d{12}\b/,
    /\b20\d{2}-\d{2}-\d{2}t\d{2}-\d{2}-\d{2}-\d{3}z\b/i,
    /\b1\d{12,}\b/,
] as const;

const getPropertyTimestamp = (property: AdminPropertyRegistryProperty) =>
    new Date(property.createdAt || 0).getTime();

const getPropertyPriceAmount = (property: AdminPropertyRegistryProperty) => {
    if (typeof property.price === 'number') {
        return property.price;
    }

    if (typeof property.price?.amount === 'number') {
        return property.price.amount;
    }

    const parsed = Number.parseFloat(String(property.priceString || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const hasTextValue = (value?: string | null) => Boolean(value?.trim());

const hasPositiveNumber = (value?: number | null) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;

const hasMeaningfulPrice = (property: AdminPropertyRegistryProperty) =>
    hasPositiveNumber(getPropertyPriceAmount(property));

export const hasAdminPropertyListingContent = (property: AdminPropertyRegistryProperty) => [
    property.title,
    property.description,
    property.city,
    property.location?.addressLine1,
    property.location?.addressLine2,
    property.location?.city,
    property.location?.postalCode,
    property.location?.country,
    property.address_line_1,
    property.address_line_2,
    property.postcode,
    property.country,
    property.listingType,
    property.listing_type,
    property.propertyType,
    property.property_type,
    property.contactName,
    property.agent_name,
].some(hasTextValue)
    || hasMeaningfulPrice(property)
    || hasPositiveNumber(property.bedrooms)
    || hasPositiveNumber(property.bathrooms)
    || hasPositiveNumber(property.rooms?.bedrooms)
    || hasPositiveNumber(property.rooms?.bathrooms);

export const isAdminPropertyAwaitingManagerSubmission = (property: AdminPropertyRegistryProperty) => {
    const normalizedStatus = normalizePropertyValue(property.status) || 'draft';
    return normalizedStatus === 'draft' && !hasAdminPropertyListingContent(property);
};

export const getAdminPropertyWorkflowFallbackLabel = (property: AdminPropertyRegistryProperty) =>
    isAdminPropertyAwaitingManagerSubmission(property)
        ? ADMIN_PROPERTY_AWAITING_MANAGER_SUBMISSION_LABEL
        : formatPropertyStatusLabel(property.status);

const getAdminPropertyRegistryText = (property: AdminPropertyRegistryProperty) => [
    property.id,
    property.propertyId,
    property.property_id,
    property.title,
    property.description,
    property.address_line_1,
    property.address_line_2,
    property.location?.addressLine1,
    property.location?.addressLine2,
    property.city,
    property.location?.city,
    property.postcode,
    property.location?.postalCode,
    property.status,
    property.contactName,
    property.agent_name,
].filter(Boolean).join(' ');

const getAdminPropertyAutomationText = (property: AdminPropertyRegistryProperty) => [
    property.id,
    property.propertyId,
    property.property_id,
    property.title,
    property.description,
    property.contactName,
    property.agent_name,
].filter(Boolean).join(' ');

export const isInternalAutomationProperty = (property: AdminPropertyRegistryProperty) => {
    const automationText = getAdminPropertyAutomationText(property);
    return INTERNAL_AUTOMATION_TEXT_PATTERNS.some((pattern) => pattern.test(automationText))
        || RAW_AUTOMATION_TIMESTAMP_PATTERNS.some((pattern) => pattern.test(automationText));
};

const COPY_PROPERTY_PATTERN = /\(copy\)/i;

const getPropertyDedupKey = (property: AdminPropertyRegistryProperty) => {
    const priceValue = typeof property.price === 'number'
        ? property.price
        : typeof property.price?.amount === 'number'
            ? property.price.amount
            : property.priceString || '';
    const location = property.location?.city || property.city || property.address_line_1 || '';
    const agent = property.contactName || property.agent_name || '';
    return `${String(property.title || '').trim().toLowerCase()}|${priceValue}|${String(location).trim().toLowerCase()}|${String(agent).trim().toLowerCase()}`;
};

export const isDuplicateCopyProperty = (property: AdminPropertyRegistryProperty) => {
    const searchableText = getAdminPropertyRegistryText(property);
    if (COPY_PROPERTY_PATTERN.test(searchableText)) {
        return true;
    }
    return false;
};

export const filterVisibleAdminPropertyRegistry = <Property extends AdminPropertyRegistryProperty>(
    properties: readonly Property[],
) => {
    const seenKeys = new Set<string>();
    const nonInternal = properties.filter((property) => !isInternalAutomationProperty(property));

    const result: Property[] = [];
    for (const property of nonInternal) {
        if (isDuplicateCopyProperty(property)) {
            continue;
        }
        const dedupKey = getPropertyDedupKey(property);
        if (seenKeys.has(dedupKey)) {
            continue;
        }
        seenKeys.add(dedupKey);
        result.push(property);
    }
    return result;
};

const matchesSearch = (property: AdminPropertyRegistryProperty, searchQuery?: string) => {
    const normalizedQuery = normalizePropertyValue(searchQuery);

    if (!normalizedQuery) {
        return true;
    }

    return normalizePropertyValue(getAdminPropertyRegistryText(property)).includes(normalizedQuery);
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
