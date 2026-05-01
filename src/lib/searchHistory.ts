import { normalizePriceBoundInput, normalizeRoomBoundInput, normalizeSearchQueryInput } from '@/lib/propertySearchControls';

export interface SearchHistoryLike {
  query?: string;
  filters?: unknown;
  result_count?: number;
  location?: string;
  postcode?: string;
}

interface ParsedHistoryFilters {
  location?: string;
  postcode?: string;
  property_type?: string;
  listing_type?: string;
  min_price?: string | number;
  max_price?: string | number;
  bedrooms?: string | number;
  bathrooms?: string | number;
}

export function parseSearchHistoryFilters(value: unknown): ParsedHistoryFilters {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value as ParsedHistoryFilters;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function buildSearchHistoryLabel(entry: SearchHistoryLike): string {
  const filters = parseSearchHistoryFilters(entry.filters);
  return normalizeSearchQueryInput(entry.query || '')
    || (entry.location || filters.location || '').trim()
    || (entry.postcode || filters.postcode || '').trim()
    || (filters.property_type || filters.listing_type || '').trim()
    || 'Recent search';
}

export function buildSearchHistoryMeta(entry: SearchHistoryLike): string {
  const count = Number(entry.result_count);
  if (!Number.isFinite(count) || count < 0) {
    return '';
  }

  return `${count} ${count === 1 ? 'result' : 'results'}`;
}

export function buildSearchHistoryUrlParams(entry: SearchHistoryLike): URLSearchParams {
  const filters = parseSearchHistoryFilters(entry.filters);
  const params = new URLSearchParams();
  const query = normalizeSearchQueryInput(entry.query || '');
  const location = (entry.location || filters.location || '').trim();
  const postcode = (entry.postcode || filters.postcode || '').trim();
  const propertyType = (filters.property_type || '').trim();
  const listingType = (filters.listing_type || '').trim();
  const minPrice = normalizePriceBoundInput(String(filters.min_price ?? ''));
  const maxPrice = normalizePriceBoundInput(String(filters.max_price ?? ''));
  const bedrooms = normalizeRoomBoundInput(String(filters.bedrooms ?? ''));
  const bathrooms = normalizeRoomBoundInput(String(filters.bathrooms ?? ''));

  if (query) params.set('q', query);
  if (location) params.set('location', location);
  if (postcode && !query.includes(postcode.toLowerCase())) params.set('postcode', postcode);
  if (propertyType) params.set('propertyType', propertyType);
  if (listingType) params.set('type', listingType);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (bedrooms) params.set('beds', bedrooms);
  if (bathrooms) params.set('baths', bathrooms);
  params.set('page', '1');

  return params;
}
