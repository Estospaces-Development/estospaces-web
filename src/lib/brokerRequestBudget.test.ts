import assert from 'node:assert/strict';
import test from 'node:test';

import { getBrokerRequestBudgetError, toBrokerRequestType } from './brokerRequestBudget';

test('broker request type normalization rejects unsupported legacy values', () => {
  assert.equal(toBrokerRequestType('rent'), 'rent');
  assert.equal(toBrokerRequestType('sell'), 'sell');
  assert.equal(toBrokerRequestType('nearest_broker'), 'buy');
});

test('broker request budgets reject missing and implausibly low purchase values', () => {
  assert.match(getBrokerRequestBudgetError('price on request', 'buy') || '', /numeric budget/);
  assert.match(getBrokerRequestBudgetError('500', 'buy') || '', /at least 10,000/);
  assert.match(getBrokerRequestBudgetError('-50000', 'buy') || '', /cannot be negative/);
  assert.match(getBrokerRequestBudgetError('-50k', 'buy') || '', /cannot be negative/);
  assert.match(getBrokerRequestBudgetError('-£50,000', 'buy') || '', /cannot be negative/);
  assert.match(getBrokerRequestBudgetError('-₹50,000', 'buy') || '', /cannot be negative/);
  assert.match(getBrokerRequestBudgetError('−£50,000', 'buy') || '', /cannot be negative/);
  assert.match(getBrokerRequestBudgetError('−50k', 'buy') || '', /cannot be negative/);
  assert.match(getBrokerRequestBudgetError('-.5m', 'buy') || '', /cannot be negative/);
  assert.match(getBrokerRequestBudgetError('£−.5m', 'buy') || '', /cannot be negative/);
  assert.match(getBrokerRequestBudgetError('.005m', 'buy') || '', /at least 10,000/);
  assert.equal(getBrokerRequestBudgetError('500k - 600k', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('500k-600k', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('£500k - £600k', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('GBP 500000 - GBP 600000', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('500000 GBP - 600000 GBP', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('INR 50000', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('50 lakh', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('50 lac', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('50 lacs', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('50L', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('1 crore', 'buy'), null);
  assert.equal(getBrokerRequestBudgetError('1 million', 'buy'), null);
  assert.match(getBrokerRequestBudgetError('500 maximum', 'buy') || '', /at least 10,000/);
  assert.match(getBrokerRequestBudgetError('500 monthly', 'buy') || '', /at least 10,000/);
});

test('broker request rent budgets accept common monthly formats', () => {
  assert.match(getBrokerRequestBudgetError('50 pcm', 'rent') || '', /at least 100/);
  assert.equal(getBrokerRequestBudgetError('2,200 pcm', 'rent'), null);
});
