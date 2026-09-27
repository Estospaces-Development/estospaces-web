/**
 * Listing states that must not start new Fast Track, viewing, application or
 * offer journeys on user surfaces. Sold listings stay publicly readable, so
 * every CTA must check this before offering a new request. The booking and
 * core services refuse the same states server-side (QA-MB-20260925-01-009).
 */
export type ListingJourneyClosureReason = 'sold' | 'let' | 'unavailable';

export interface ListingJourneyAvailability {
  isClosed: boolean;
  reason: ListingJourneyClosureReason | null;
  label: string;
  message: string;
}

const SOLD_STATUSES = new Set(['sold']);
const LET_STATUSES = new Set(['let', 'rented']);
const UNAVAILABLE_STATUSES = new Set([
  'archived',
  'off_market',
  'offline',
  'sale_closing',
  'suspended',
  'withdrawn',
]);

const OPEN_AVAILABILITY: ListingJourneyAvailability = {
  isClosed: false,
  reason: null,
  label: '',
  message: '',
};

export function getListingJourneyAvailability(status?: string | null): ListingJourneyAvailability {
  const normalized = String(status || '').trim().toLowerCase();
  if (SOLD_STATUSES.has(normalized)) {
    return {
      isClosed: true,
      reason: 'sold',
      label: 'Sold',
      message: 'This property has been sold, so new Fast Track, viewing and offer requests are closed.',
    };
  }
  if (LET_STATUSES.has(normalized)) {
    return {
      isClosed: true,
      reason: 'let',
      label: 'Let',
      message: 'This property has been let, so new Fast Track, viewing and application requests are closed.',
    };
  }
  if (UNAVAILABLE_STATUSES.has(normalized)) {
    return {
      isClosed: true,
      reason: 'unavailable',
      label: 'Unavailable',
      message: 'This property is not currently available, so new Fast Track, viewing and application requests are closed.',
    };
  }
  return OPEN_AVAILABILITY;
}

export function isListingClosedForNewJourneys(status?: string | null): boolean {
  return getListingJourneyAvailability(status).isClosed;
}
