export type DiscoverListingTab = 'all' | 'buy' | 'rent';
export type DiscoverViewMode = 'grid' | 'map';

export interface DiscoverSearchState {
  query: string;
  location: string;
  status: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  dashboardFilter: string;
  sortBy: string;
  listingTab: DiscoverListingTab;
  viewMode: DiscoverViewMode;
  page: number;
}

export interface DiscoverSearchSourceSelection {
  search: string;
  useCachedSearch: boolean;
  discardCachedSearch: boolean;
}

const DISCOVER_RETURN_HISTORY_KEY = 'estospacesDiscoverReturn';

export const markDiscoverReturnHistoryState = (state: unknown) => ({
  ...(state && typeof state === 'object' ? state : {}),
  [DISCOVER_RETURN_HISTORY_KEY]: true,
});

export const isDiscoverReturnHistoryState = (state: unknown) => Boolean(
  state
  && typeof state === 'object'
  && (
    (state as Record<string, unknown>)[DISCOVER_RETURN_HISTORY_KEY] === true
    || (
      (state as Record<string, unknown>).usr
      && typeof (state as Record<string, unknown>).usr === 'object'
      && ((state as Record<string, unknown>).usr as Record<string, unknown>)[DISCOVER_RETURN_HISTORY_KEY] === true
    )
  ),
);

export const consumeDiscoverReturnHistoryState = (state: unknown) => {
  if (!state || typeof state !== 'object') {
    return state;
  }

  const nextState = { ...(state as Record<string, unknown>) };
  delete nextState[DISCOVER_RETURN_HISTORY_KEY];
  if (nextState.usr && typeof nextState.usr === 'object') {
    const nextRouterState = { ...(nextState.usr as Record<string, unknown>) };
    delete nextRouterState[DISCOVER_RETURN_HISTORY_KEY];
    nextState.usr = nextRouterState;
  }
  return nextState;
};

const normalizeSearch = (value: string) => {
  const normalized = value.trim().replace(/^\?/, '');
  return normalized ? new URLSearchParams(normalized).toString() : '';
};

export const selectDiscoverSearchSource = (
  urlSearch: string,
  cachedSearch: string | null,
  isReturnEntry = false,
): DiscoverSearchSourceSelection => {
  const normalizedUrlSearch = normalizeSearch(urlSearch);
  const hasCachedSearch = cachedSearch !== null;
  const normalizedCachedSearch = normalizeSearch(cachedSearch || '');
  const useCachedSearch = isReturnEntry
    && hasCachedSearch
    && normalizedCachedSearch === normalizedUrlSearch;

  return {
    search: useCachedSearch ? normalizedCachedSearch : normalizedUrlSearch,
    useCachedSearch,
    discardCachedSearch: Boolean(
      hasCachedSearch
      && !useCachedSearch,
    ),
  };
};

const setWhenPresent = (params: URLSearchParams, key: string, value: string) => {
  const normalized = value.trim();
  if (normalized) {
    params.set(key, normalized);
  }
};

export const buildDiscoverSearchParams = (state: DiscoverSearchState) => {
  const params = new URLSearchParams();

  setWhenPresent(params, 'q', state.query);
  setWhenPresent(params, 'location', state.location);
  setWhenPresent(params, 'status', state.status);
  if (state.propertyType !== 'all') {
    setWhenPresent(params, 'propertyType', state.propertyType);
  }
  setWhenPresent(params, 'minPrice', state.minPrice);
  setWhenPresent(params, 'maxPrice', state.maxPrice);
  setWhenPresent(params, 'beds', state.bedrooms);
  setWhenPresent(params, 'baths', state.bathrooms);
  setWhenPresent(params, 'filter', state.dashboardFilter);
  if (state.sortBy !== 'relevance') {
    setWhenPresent(params, 'sort', state.sortBy);
  }
  if (state.listingTab !== 'all') {
    params.set('type', state.listingTab);
  }
  if (state.viewMode !== 'grid') {
    params.set('view', state.viewMode);
  }
  if (Number.isFinite(state.page) && state.page > 1) {
    params.set('page', String(Math.trunc(state.page)));
  }

  return params;
};

export const readDiscoverViewMode = (params: URLSearchParams): DiscoverViewMode => (
  params.get('view') === 'map' ? 'map' : 'grid'
);
