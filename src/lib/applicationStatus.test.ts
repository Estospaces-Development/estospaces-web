import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applicationStatusMatches,
  normalizeApplicationStatus,
} from './applicationStatus';

test('application status matching tolerates casing, spaces, and hyphens', () => {
  assert.equal(normalizeApplicationStatus('  APPROVED '), 'approved');
  assert.equal(normalizeApplicationStatus('offer-under-review'), 'offer_under_review');
  assert.equal(applicationStatusMatches('Approved', 'approved'), true);
  assert.equal(applicationStatusMatches('offer under review', 'offer_under_review'), true);
  assert.equal(applicationStatusMatches('rejected', 'approved'), false);
});
