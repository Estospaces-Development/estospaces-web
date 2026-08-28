interface SavedSearchPageOptions {
  preserveAlert?: boolean;
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
