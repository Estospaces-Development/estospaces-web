export const canLoadManagerInventory = (
  isLoading: boolean,
  isVerified: boolean,
  pathname: string,
): boolean => !isLoading && (
  isVerified
  // Draft creation is allowed before approval; the owner must be able to reopen it.
  || pathname === '/manager/dashboard/properties'
  || pathname.startsWith('/manager/dashboard/properties/')
);
