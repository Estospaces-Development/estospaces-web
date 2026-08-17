export const getManagerFastTrackRequestSearch = (search: string): string | null => {
  const params = new URLSearchParams(search);
  if (params.get('fast-track') !== 'request') return null;
  return params.get('broker-request') || params.get('lead') || params.get('client') || params.get('property') || '';
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
  else if (!brokerRequestId && clientId) params.set('client', clientId);
  else if (!brokerRequestId && propertyId) params.set('property', propertyId);
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
