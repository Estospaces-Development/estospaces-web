import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildManagerFastTrackRequestPath,
  clearManagerFastTrackRequestNavigation,
  getManagerFastTrackRequestContext,
} from './managerFastTrackRequestNavigation';

test('Fast Track request path carries every known start identifier', () => {
  assert.equal(
    buildManagerFastTrackRequestPath({ brokerRequestId: 'request-42', leadId: 'lead-42' }),
    '/manager/dashboard?fast-track=request&broker-request=request-42&lead=lead-42',
  );
  assert.equal(
    buildManagerFastTrackRequestPath({
      brokerRequestId: 'request-42',
      leadId: 'lead-42',
      clientId: 'user-42',
      propertyId: 'property-42',
    }),
    '/manager/dashboard?fast-track=request&broker-request=request-42&lead=lead-42&client=user-42&property=property-42',
  );
  assert.equal(
    buildManagerFastTrackRequestPath({ clientId: 'user-42', propertyId: 'property-42' }),
    '/manager/dashboard?fast-track=request&client=user-42&property=property-42',
  );
});

test('Fast Track request link is read as structured context, not a free-text search', () => {
  assert.deepEqual(
    getManagerFastTrackRequestContext('?fast-track=request&broker-request=request-42&lead=lead-42&client=user-42&property=property-42'),
    { brokerRequestId: 'request-42', leadId: 'lead-42', clientId: 'user-42', propertyId: 'property-42' },
  );
  assert.deepEqual(
    getManagerFastTrackRequestContext('?fast-track=request&lead=lead-42'),
    { brokerRequestId: undefined, leadId: 'lead-42', clientId: undefined, propertyId: undefined },
  );
  assert.deepEqual(
    getManagerFastTrackRequestContext('?fast-track=request'),
    { brokerRequestId: undefined, leadId: undefined, clientId: undefined, propertyId: undefined },
  );
  assert.equal(getManagerFastTrackRequestContext('?section=properties'), null);
});

test('closing the requested Fast Track flow removes only its navigation context', () => {
  assert.equal(
    clearManagerFastTrackRequestNavigation(
      '/manager/dashboard',
      '?fast-track=request&broker-request=request-42&lead=lead-42&client=user-42&property=property-42&section=overview',
    ),
    '/manager/dashboard?section=overview',
  );
});

test('manager dashboard passes structured request context into a start-capable Fast Track modal', () => {
  const root = process.cwd();
  const dashboard = readFileSync(resolve(root, 'src/pages/manager/dashboard/page.tsx'), 'utf8');
  const modal = readFileSync(resolve(root, 'src/components/manager/FastTrack/ManualFastTrackModal.tsx'), 'utf8');

  assert.match(dashboard, /requestContext=\{fastTrackRequestContext\}/);
  assert.match(dashboard, /setIsManualFastTrackOpen\(true\)/);
  assert.doesNotMatch(modal, /setSearchQuery\(initialSearch/);
  assert.match(modal, /leadMatchesRequestContext\(lead, requestContext\)/);
  assert.match(modal, /findRequestContextCaseMatch\(existingCases, requestContext\)/);
  assert.match(modal, /getRequestContextCaseHeading\(/);
  assert.doesNotMatch(modal, />\s*This request already has an active 24-hour case\s*</);
  assert.match(modal, /Open existing case/);
  assert.match(modal, /lead\.id,/);
  assert.match(modal, /handleCreateCase\(lead, activeCase\)/);
  assert.match(modal, /getFastTrackStartSuccessMessage\(/);
});
