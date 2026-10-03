import { format } from 'date-fns';

import { getApplicationPropertyDisplayTitle, isInternalApplicationTitle } from './applicationDisplayTitle';
import { getBrokerRequestBudgetError, toBrokerRequestType } from './brokerRequestBudget';
import { dedupeBrokerRequestsBySubmissionSignature } from './brokerRequestSelection';
import { formatLaunchCurrencyForCountry, getSupportedLaunchCountry } from './launchLocale';
import type { BrokerRequestRecord } from '@/services/leadsService';

export const isUserVisibleBrokerRequest = (request: BrokerRequestRecord) => (
  !isInternalApplicationTitle(request.selected_property?.title)
);

export const getBrokerRequestDisplayTitle = (request: BrokerRequestRecord) => (
  getApplicationPropertyDisplayTitle(
    request.selected_property?.title,
    request.selected_property?.address_line_1,
    'Property agent request',
  )
);

export const getBrokerRequestRequestedLabel = (request: BrokerRequestRecord) => {
  const requestedAt = new Date(request.created_at || '');
  if (!Number.isFinite(requestedAt.getTime())) {
    return 'Requested date unavailable';
  }

  return `Requested ${format(requestedAt, 'd MMM, HH:mm:ss')}`;
};

export const getBrokerRequestBudgetDisplayLabel = (request: BrokerRequestRecord) => {
  const budget = String(request.budget || '').trim();
  if (!budget) {
    return 'Budget unavailable';
  }

  if (getBrokerRequestBudgetError(budget, toBrokerRequestType(request.request_type))) {
    return 'Budget needs updating';
  }

  // A bare number ("730000") is shown in the request's currency ("₹7,30,000");
  // free text such as "2,650 pcm" is kept as the user wrote it.
  const locationCode = request.location_postcode || request.location;
  if (/^\d+$/.test(budget) && getSupportedLaunchCountry(null, null, locationCode)) {
    const formatted = formatLaunchCurrencyForCountry(Number(budget), { locationCode });
    if (formatted) return `Budget ${formatted}`;
  }

  return `Budget ${budget}`;
};

export const dedupeBrokerRequestsForTimeline = (requests: BrokerRequestRecord[]) => (
  dedupeBrokerRequestsBySubmissionSignature(requests)
);
