import { getApplicationPropertyDisplayTitle, isInternalApplicationTitle } from './applicationDisplayTitle';
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

export const dedupeBrokerRequestsForTimeline = (requests: BrokerRequestRecord[]) => (
  dedupeBrokerRequestsBySubmissionSignature(requests)
);
