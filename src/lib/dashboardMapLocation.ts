export const syncDashboardMapLocation = async (
  searchInput: string,
  updateLocationFromSearch: (value: string) => Promise<unknown>,
  clearSearchLocation: () => void,
) => {
  const normalizedSearch = searchInput.trim();
  if (!normalizedSearch) {
    clearSearchLocation();
    return null;
  }

  return updateLocationFromSearch(normalizedSearch);
};

export const createDashboardMapLocationGate = () => {
  let revision = 0;

  return {
    begin: () => {
      revision += 1;
      return revision;
    },
    invalidate: () => {
      revision += 1;
    },
    isCurrent: (candidate: number) => candidate === revision,
  };
};
