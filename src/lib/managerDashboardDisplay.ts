import { formatLaunchPropertyLocation } from './launchLocale';

interface ManagerPropertySizeFields {
  property_size_sqft?: number | null;
  area?: number | null;
  sqft?: number | null;
}

export const resolveManagerPropertySize = ({
  property_size_sqft,
  area,
  sqft,
}: ManagerPropertySizeFields): number => (
  property_size_sqft || area || sqft || 0
);

interface ManagerLiveResponseBadgeInput {
  availableForFastResponse: boolean;
  availabilityBlockedReason: string | null;
  pendingCount: number;
}

export const getManagerLiveResponseBadge = ({
  availableForFastResponse,
  availabilityBlockedReason,
  pendingCount,
}: ManagerLiveResponseBadgeInput): string => (
  availableForFastResponse && !availabilityBlockedReason
    ? `${pendingCount} waiting`
    : 'Not tracking'
);

interface ManagerPropertyLocationFields {
  address?: string | null;
  address_line_1?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  location?: {
    addressLine1?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | string | null;
}

export const getManagerPropertyLocation = (property: ManagerPropertyLocationFields): string => {
  const mappedLocation = typeof property.location === 'object' ? property.location : null;

  return formatLaunchPropertyLocation([
    property.address
      || property.address_line_1
      || (typeof property.location === 'string' ? property.location : mappedLocation?.addressLine1),
    property.city || mappedLocation?.city,
    property.postcode || mappedLocation?.postalCode,
    property.country || mappedLocation?.country,
  ]);
};
