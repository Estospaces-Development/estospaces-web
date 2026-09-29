// The full-page loader is only for the very first inventory request. After
// that, a refetch (for example while the manager types a search that has no
// matches) must keep the page, and with it the focused search input, mounted.
export const shouldShowManagerPropertyInitialLoader = (
  loading: boolean,
  propertyCount: number,
  total: number,
  hasSettledOnce = false,
): boolean => !hasSettledOnce && loading && propertyCount === 0 && total === 0;
