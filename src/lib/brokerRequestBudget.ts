export type BrokerRequestType = 'buy' | 'rent' | 'sell';

export const toBrokerRequestType = (value: unknown): BrokerRequestType => (
  value === 'rent' || value === 'sell' ? value : 'buy'
);

const BUY_MINIMUM = 10_000;
const RENT_MINIMUM = 100;

const parseBudgetAmount = (value: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(
      /((?:\d+(?:\.\d+)?|\.\d+)\s*(?:(?:crores?|cr|lakhs?|lacs?|millions?|thousands?|[kml](?![a-z]))\s*)?(?:(?:inr|gbp|usd|₹|£|\$)\s*)?(?:(?:pcm|p\/m|per month|\/month|\/mo)\s*)?)\s*-\s*((?:(?:inr|gbp|usd|₹|£|\$)\s*)?(?:\d+(?:\.\d+)?|\.\d+))/g,
      '$1 to $2',
    );
  if (/(?:[-−]\s*(?:(?:inr|gbp|usd|₹|£|\$)\s*)?|(?:(?:inr|gbp|usd|₹|£|\$)\s*)[-−]\s*)(?:\d+(?:\.\d+)?|\.\d+)/i.test(normalized)) {
    return { amount: 0, hasNegative: true };
  }
  const matches = Array.from(normalized.matchAll(
    /([+−-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(crores?|cr|lakhs?|lacs?|millions?|thousands?|[kml](?![a-z]))?/g,
  ));
  if (matches.length === 0) {
    return null;
  }

  const amounts = matches.map((match) => {
    const amount = Number.parseFloat(match[1].replace('−', '-'));
    const unit = match[2];
    const multiplier = unit === 'm' || unit === 'million' || unit === 'millions'
      ? 1_000_000
      : unit === 'k' || unit === 'thousand' || unit === 'thousands'
        ? 1_000
        : unit === 'l' || unit === 'lakh' || unit === 'lakhs' || unit === 'lac' || unit === 'lacs'
          ? 100_000
          : unit === 'cr' || unit === 'crore' || unit === 'crores'
            ? 10_000_000
            : 1;
    return Number.isFinite(amount) ? amount * multiplier : 0;
  });

  return {
    amount: Math.max(...amounts),
    hasNegative: amounts.some((amount) => amount < 0),
  };
};

export const getBrokerRequestBudgetError = (
  value: string,
  requestType: BrokerRequestType,
) => {
  const parsedBudget = parseBudgetAmount(value);
  if (parsedBudget === null) {
    return 'Enter a numeric budget, for example 500,000 or 2,000 pcm.';
  }
  if (parsedBudget.hasNegative) {
    return 'Budget amounts cannot be negative.';
  }

  const minimum = requestType === 'rent' ? RENT_MINIMUM : BUY_MINIMUM;
  if (parsedBudget.amount < minimum) {
    return requestType === 'rent'
      ? 'Enter a monthly rent budget of at least 100.'
      : 'Enter a purchase budget of at least 10,000.';
  }

  return null;
};
