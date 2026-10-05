import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  formatBrokerRequestBudgetSummary,
  getBrokerRequestBudgetError,
  getBrokerRequestRequirementsError,
  toBrokerRequestType,
} from './brokerRequestBudget';

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

test('request summary budget shows the currency and, for rent, the period (web-app#673)', () => {
  assert.equal(formatBrokerRequestBudgetSummary('500-700', 'rent', 'INR'), '₹500-700 / month');
  assert.equal(formatBrokerRequestBudgetSummary('5,00,000 - 6,00,000', 'buy', 'INR'), '₹5,00,000 - 6,00,000');
  assert.equal(formatBrokerRequestBudgetSummary('2,000 pcm', 'rent', 'GBP'), '£2,000 pcm');
  assert.equal(formatBrokerRequestBudgetSummary('₹25k pm', 'rent', 'INR'), '₹25k pm');
  assert.equal(formatBrokerRequestBudgetSummary('INR 30000 per month', 'rent', 'INR'), 'INR 30000 per month');
  assert.equal(formatBrokerRequestBudgetSummary('  ', 'rent', 'INR'), '');
});

test('requirements need words, not just a number (web-app#675)', () => {
  assert.ok(getBrokerRequestRequirementsError('2'));
  assert.ok(getBrokerRequestRequirementsError('  12 3 '));
  assert.equal(getBrokerRequestRequirementsError('1 bedroom'), null);
  assert.equal(getBrokerRequestRequirementsError('2 BHK near metro'), null);
  assert.equal(getBrokerRequestRequirementsError('இரண்டு அறை'), null);
});

test('agent request submit shows every field error at once and checks the PIN on blur (web-app#674)', () => {
  const widget = readFileSync(new URL('../components/dashboard/BrokerRequestWidget.tsx', import.meta.url), 'utf8');
  const submit = widget.slice(widget.indexOf('const handleSubmit = async'), widget.indexOf('setLoading(true);', widget.indexOf('const handleSubmit = async')));
  assert.match(submit, /setBudgetError\(nextBudgetError\);\s*setPostcodeError\(nextPostcodeError\);\s*setDetailsError\(nextDetailsError\);\s*if \(nextBudgetError \|\| nextPostcodeError \|\| nextDetailsError\) \{\s*return;/);
  assert.doesNotMatch(submit, /setBudgetError\(nextBudgetError\);\s*return;/);
  assert.match(widget, /onBlur=\{\(\) => \{\s*const trimmedValue = normalizePostcode\(locationPostcode\);[\s\S]{0,200}setPostcodeError\(getLaunchLocationCodeErrorMessage/);
  assert.match(widget, /id="broker-request-details-error" role="alert"/);
});
