import assert from 'node:assert/strict';
import test from 'node:test';

import { getBrokerShortlistDueValue, getBrokerShortlistTimingCopy } from './brokerShortlistTiming';

test('expired shortlist timing uses human copy instead of zero minutes', () => {
  assert.equal(getBrokerShortlistTimingCopy(0), 'Your property agent is finishing the shortlist now.');
  assert.equal(getBrokerShortlistDueValue(0), 'Any moment');
});

test('future shortlist timing preserves the remaining time', () => {
  assert.equal(getBrokerShortlistTimingCopy(1), 'Your property agent should share options within about 1 minute.');
  assert.equal(getBrokerShortlistDueValue(12), '12m');
});
