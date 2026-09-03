interface SavedSearchPageOptions {
  preserveAlert?: boolean;
}

interface SavedSearchRerunFilters {
  query?: string;
  location?: string;
  country?: string;
  min_price?: number;
  max_price?: number;
  property_type?: string;
  listing_type?: string;
  bedrooms?: number;
  bathrooms?: number;
}

export const getSavedSearchTargetPage = (
  requestedPage: number,
  totalItems: number,
  alertIndex: number,
  pageSize: number,
): number => {
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  if (alertIndex >= 0) {
    return Math.floor(alertIndex / safePageSize) + 1;
  }
  return Math.min(Math.max(Math.floor(requestedPage) || 1, 1), totalPages);
};

export const buildSavedSearchPageParams = (
  searchParams: URLSearchParams,
  page: number,
  options: SavedSearchPageOptions = {},
): URLSearchParams => {
  const next = new URLSearchParams(searchParams);
  if (page <= 1) {
    next.delete('searchesPage');
  } else {
    next.set('searchesPage', String(page));
  }
  if (!options.preserveAlert) {
    next.delete('alert');
  }
  next.set('tab', 'searches');
  return next;
};

export const buildSavedSearchRerunParams = (
  search: SavedSearchRerunFilters,
): URLSearchParams => {
  const params = new URLSearchParams();
  if (search.query) params.set('q', search.query);
  if (search.location) params.set('location', search.location);
  if (search.country) params.set('market', search.country);
  if (search.min_price !== undefined && search.min_price !== null) params.set('minPrice', String(search.min_price));
  if (search.max_price !== undefined && search.max_price !== null) params.set('maxPrice', String(search.max_price));
  if (search.property_type) params.set('propertyType', search.property_type);
  if (search.listing_type) params.set('type', search.listing_type);
  if (search.bedrooms !== undefined && search.bedrooms !== null) params.set('beds', String(search.bedrooms));
  if (search.bathrooms !== undefined && search.bathrooms !== null) params.set('baths', String(search.bathrooms));
  return params;
};
