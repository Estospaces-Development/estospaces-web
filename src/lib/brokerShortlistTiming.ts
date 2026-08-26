export const getBrokerShortlistTimingCopy = (minutesRemaining: number | null) => {
  if (minutesRemaining === null) {
    return 'Your property agent is preparing home choices for this request.';
  }
  if (minutesRemaining <= 0) {
    return 'Your property agent is finishing the shortlist now.';
  }
  return `Your property agent should share options within about ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}.`;
};

export const getBrokerShortlistDueValue = (minutesRemaining: number) => (
  minutesRemaining <= 0 ? 'Any moment' : `${minutesRemaining}m`
);
