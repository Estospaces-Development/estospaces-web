export const shouldShowManagerPropertyInitialLoader = (
  loading: boolean,
  propertyCount: number,
  total: number,
): boolean => loading && propertyCount === 0 && total === 0;
