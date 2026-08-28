export interface ManagerSearchDestination {
  key: string;
  label: string;
  path: string;
}

export const getManagerSearchDestinations = (query: string): ManagerSearchDestination[] => {
  const normalized = query.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];
  const encoded = encodeURIComponent(normalized);

  return [
    { key: 'properties', label: `Properties matching “${normalized}”`, path: `/manager/dashboard/properties?search=${encoded}` },
    { key: 'leads', label: `Leads and clients matching “${normalized}”`, path: `/manager/leads?search=${encoded}` },
    { key: 'fast-track', label: `Tasks and 24-hour journeys matching “${normalized}”`, path: `/manager/fast-track?search=${encoded}` },
  ];
};
