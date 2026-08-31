import { format } from 'date-fns';

import { getApplicationPropertyDisplayTitle, isInternalApplicationTitle } from './applicationDisplayTitle';
import { getBrokerRequestBudgetError, toBrokerRequestType } from './brokerRequestBudget';
import { dedupeBrokerRequestsBySubmissionSignature } from './brokerRequestSelection';
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

  return getBrokerRequestBudgetError(budget, toBrokerRequestType(request.request_type))
    ? 'Budget needs updating'
    : `Budget ${budget}`;
};

export const dedupeBrokerRequestsForTimeline = (requests: BrokerRequestRecord[]) => (
  dedupeBrokerRequestsBySubmissionSignature(requests)
);
