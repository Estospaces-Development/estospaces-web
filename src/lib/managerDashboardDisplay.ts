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
