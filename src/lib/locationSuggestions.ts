import type { AutocompleteSuggestion } from '@/services/searchService';

const locationSuggestionTypes = new Set<AutocompleteSuggestion['type']>([
  'location',
  'city',
  'postcode',
]);

export const selectLocationSuggestions = (
  suggestions: AutocompleteSuggestion[],
  limit = 10,
): AutocompleteSuggestion[] => suggestions
  .filter((suggestion) => locationSuggestionTypes.has(suggestion.type))
  .slice(0, limit);
