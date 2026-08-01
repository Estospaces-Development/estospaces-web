import test from 'node:test';
import assert from 'node:assert/strict';

import { selectLocationSuggestions } from './locationSuggestions';

test('location autocomplete removes property-title suggestions', () => {
  const suggestions = selectLocationSuggestions([
    { id: 'property-1', text: 'OcenView', type: 'property' },
    { text: 'Chennai', type: 'city' },
    { id: 'property-2', text: 'Luxiors', type: 'property' },
    { text: '600001', city: 'Chennai', type: 'postcode' },
    { text: 'Popular homes', type: 'popular' },
  ]);

  assert.deepEqual(suggestions, [
    { text: 'Chennai', type: 'city' },
    { text: '600001', city: 'Chennai', type: 'postcode' },
  ]);
});

test('location autocomplete applies its limit after removing irrelevant rows', () => {
  const suggestions = selectLocationSuggestions([
    { text: 'Unrelated property', type: 'property' },
    { text: 'Chennai', type: 'city' },
    { text: 'Chennai Central', type: 'location' },
  ], 1);

  assert.deepEqual(suggestions, [{ text: 'Chennai', type: 'city' }]);
});
