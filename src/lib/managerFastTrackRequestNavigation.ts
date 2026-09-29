export interface ManagerFastTrackRequestContext {
  brokerRequestId?: string;
  leadId?: string;
  clientId?: string;
  propertyId?: string;
}

/**
 * Reads the structured start context from a manager Fast Track request link.
 * Returns null when the link does not ask to open the start flow. The IDs are
 * matched against leads and cases by field, never as free-text search, because
 * a broker-request UUID is not a lead search term.
 */
export const getManagerFastTrackRequestContext = (search: string): ManagerFastTrackRequestContext | null => {
  const params = new URLSearchParams(search);
  if (params.get('fast-track') !== 'request') return null;
  const read = (key: string) => params.get(key)?.trim() || undefined;
  return {
    brokerRequestId: read('broker-request'),
    leadId: read('lead'),
    clientId: read('client'),
    propertyId: read('property'),
  };
};

export const buildManagerFastTrackRequestPath = ({
  brokerRequestId,
  leadId,
  clientId,
  propertyId,
}: {
  brokerRequestId?: string;
  leadId?: string;
  clientId?: string;
  propertyId?: string;
}) => {
  const params = new URLSearchParams({ 'fast-track': 'request' });
  if (brokerRequestId) params.set('broker-request', brokerRequestId);
  if (leadId) params.set('lead', leadId);
  // Client and property identify the case the booking service would reuse, so
  // the start flow can find an existing case even when the lead is not listed.
  if (clientId) params.set('client', clientId);
  if (propertyId) params.set('property', propertyId);
  return `/manager/dashboard?${params.toString()}`;
};

export const clearManagerFastTrackRequestNavigation = (pathname: string, search: string): string => {
  const params = new URLSearchParams(search);
  params.delete('fast-track');
  params.delete('broker-request');
  params.delete('lead');
  params.delete('client');
  params.delete('property');
  const nextSearch = params.toString();
  return `${pathname}${nextSearch ? `?${nextSearch}` : ''}`;
};
