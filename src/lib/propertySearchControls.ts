export type PropertySearchSortValue = 'relevance' | 'newest' | 'price_asc' | 'price_desc';

export interface PropertySearchSortOption {
  value: PropertySearchSortValue;
  label: string;
}

export interface CountryAwarePropertyInput {
  id?: string;
  title?: string;
  city?: string;
  location?: string;
  country?: string;
  country_code?: string;
}

export interface CountryAwarePropertyGroup {
  key: string;
  label: string;
  count: number;
}

export interface SearchUrlFilters {
  query: string;
  location: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  baths: string;
  listingType: string;
  sortBy: PropertySearchSortValue;
  page: number;
}

const MAX_SEARCH_QUERY_LENGTH = 120;
const MAX_PRICE_BOUND = 100_000_000;
const MAX_ROOM_BOUND = 20;
const SEARCH_QUERY_ALLOWED_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s'.,/-]*$/u;

const SORT_OPTIONS: PropertySearchSortOption[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export function getPropertySearchSortOptions(): PropertySearchSortOption[] {
  return SORT_OPTIONS;
}

export function normalizePropertySearchSort(value: string | null | undefined): PropertySearchSortValue {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as PropertySearchSortValue)
    : 'relevance';
}

export function normalizePriceBoundInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return '';
  }

  return String(Math.min(MAX_PRICE_BOUND, Math.max(0, Math.trunc(parsed))));
}

export function getPriceBoundAdjustmentMessage(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return 'Price values must be numbers.';
  }
  if (parsed < 0) {
    return 'Price values must be zero or greater.';
  }
  if (parsed > MAX_PRICE_BOUND) {
    return `Price values must be ${MAX_PRICE_BOUND} or less.`;
  }

  return '';
}

export function normalizeRoomBoundInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const parsed = Number(trimmed);
  const roomCount = Math.trunc(parsed);
  if (!Number.isFinite(parsed) || roomCount < 0 || roomCount > MAX_ROOM_BOUND) {
    return '';
  }

  return String(roomCount);
}

export function normalizeSearchQueryInput(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_SEARCH_QUERY_LENGTH)
    .trim()
    .toLowerCase();
}

export function getSearchQueryValidationMessage(value: string, required = false): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? 'Enter a search term.' : '';
  }
  if (trimmed.length > MAX_SEARCH_QUERY_LENGTH) {
    return 'Search text must be 120 characters or fewer.';
  }
  if (!SEARCH_QUERY_ALLOWED_PATTERN.test(trimmed)) {
    return 'Search text can use letters, numbers, spaces, and common punctuation.';
  }

  return '';
}

function firstParam(params: URLSearchParams, names: string[]): string {
  for (const name of names) {
    const value = params.get(name);
    if (value !== null) {
      return value;
    }
  }

  return '';
}

function readPositivePage(value: string): number {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function hasInvalidPriceParam(params: URLSearchParams): boolean {
  return ['minPrice', 'min_price', 'maxPrice', 'max_price'].some((name) => {
    const value = params.get(name);
    return !!value?.trim() && !Number.isFinite(Number(value.trim()));
  });
}

function hasAdjustedPriceParam(params: URLSearchParams): boolean {
  return ['minPrice', 'min_price', 'maxPrice', 'max_price'].some((name) => {
    const value = params.get(name);
    return !!value?.trim() && normalizePriceBoundInput(value) !== value.trim();
  });
}

function hasInvalidRoomParam(params: URLSearchParams): boolean {
  return ['beds', 'minBedrooms', 'baths', 'minBathrooms'].some((name) => {
    const value = params.get(name);
    return !!value?.trim() && normalizeRoomBoundInput(value) === '';
  });
}

export function getSearchFilterValidationMessage(params: URLSearchParams): string | null {
  const messages: string[] = [];
  const queryValidation = getSearchQueryValidationMessage(firstParam(params, ['q', 'keyword']), params.has('q') || params.has('keyword'));

  if (queryValidation) {
    messages.push(queryValidation.replace(/\.$/, ''));
  } else if (normalizeSearchQueryInput(firstParam(params, ['q', 'keyword'])) !== firstParam(params, ['q', 'keyword']).trim().toLowerCase()) {
    messages.push('search text was normalized and capped');
  }
  if (hasInvalidPriceParam(params)) {
    messages.push('price values must be numbers');
  } else if (hasAdjustedPriceParam(params)) {
    messages.push('price values must stay between 0 and 100000000');
  }
  if (hasInvalidRoomParam(params)) {
    messages.push('bedroom and bathroom values must be between 0 and 20');
  }

  return messages.length > 0 ? `Some search filters were adjusted: ${messages.join('; ')}.` : null;
}

export function readSearchUrlFilters(params: URLSearchParams): SearchUrlFilters {
  return {
    query: normalizeSearchQueryInput(firstParam(params, ['q', 'keyword'])),
    location: firstParam(params, ['location']).trim(),
    propertyType: firstParam(params, ['propertyType', 'property_type']).trim(),
    minPrice: normalizePriceBoundInput(firstParam(params, ['minPrice', 'min_price'])),
    maxPrice: normalizePriceBoundInput(firstParam(params, ['maxPrice', 'max_price'])),
    bedrooms: normalizeRoomBoundInput(firstParam(params, ['beds', 'minBedrooms'])),
    baths: normalizeRoomBoundInput(firstParam(params, ['baths', 'minBathrooms'])),
    listingType: firstParam(params, ['type', 'listing_type', 'listingType']).trim(),
    sortBy: normalizePropertySearchSort(firstParam(params, ['sort', 'sortBy'])),
    page: readPositivePage(firstParam(params, ['page'])),
  };
}

export function getCountryAwarePropertyGroups(
  properties: CountryAwarePropertyInput[],
): CountryAwarePropertyGroup[] {
  if (properties.length === 0) {
    return [];
  }

  const groups = new Map<string, CountryAwarePropertyGroup>();
  for (const property of properties) {
    const key = (property.country_code || '').trim().toUpperCase() || 'GB';
    const country = (property.country || '').trim();
    const label = country && country.toLowerCase() !== 'gb'
      ? `${country} properties`
      : 'United Kingdom properties';
    const current = groups.get(key);

    if (current) {
      current.count += 1;
    } else {
      groups.set(key, { key, label, count: 1 });
    }
  }

  return Array.from(groups.values()).sort((left, right) => left.label.localeCompare(right.label));
}
