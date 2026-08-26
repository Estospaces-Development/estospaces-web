import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildManagerFastTrackRequestPath,
  clearManagerFastTrackRequestNavigation,
  getManagerFastTrackRequestSearch,
} from './managerFastTrackRequestNavigation';

test('Fast Track request fallback path opens manager approval with the best available context', () => {
  assert.equal(
    buildManagerFastTrackRequestPath({ brokerRequestId: 'request-42', leadId: 'lead-42' }),
    '/manager/dashboard?fast-track=request&broker-request=request-42&lead=lead-42',
  );
  assert.equal(
    getManagerFastTrackRequestSearch('?fast-track=request&broker-request=request-42&lead=lead-42'),
    'request-42',
  );
  assert.equal(
    buildManagerFastTrackRequestPath({ leadId: 'lead-42', clientId: 'user-42' }),
    '/manager/dashboard?fast-track=request&lead=lead-42',
  );
  assert.equal(
    buildManagerFastTrackRequestPath({ clientId: 'user-42', propertyId: 'property-42' }),
    '/manager/dashboard?fast-track=request&client=user-42',
  );
});

test('Fast Track request notification opens the manager start flow on the requested lead', () => {
  assert.equal(
    getManagerFastTrackRequestSearch('?fast-track=request&lead=lead-42'),
    'lead-42',
  );
  assert.equal(
    getManagerFastTrackRequestSearch('?fast-track=request&client=user-42'),
    'user-42',
  );
  assert.equal(getManagerFastTrackRequestSearch('?section=properties'), null);
});

test('closing the requested Fast Track flow removes only its navigation context', () => {
  assert.equal(
    clearManagerFastTrackRequestNavigation(
      '/manager/dashboard',
      '?fast-track=request&broker-request=request-42&lead=lead-42&section=overview',
    ),
    '/manager/dashboard?section=overview',
  );
});

test('manager dashboard passes notification context into a start-capable Fast Track modal', () => {
  const root = process.cwd();
  const dashboard = readFileSync(resolve(root, 'src/pages/manager/dashboard/page.tsx'), 'utf8');
  const modal = readFileSync(resolve(root, 'src/components/manager/FastTrack/ManualFastTrackModal.tsx'), 'utf8');

  assert.match(dashboard, /initialSearch=\{fastTrackRequestSearch \|\| ''\}/);
  assert.match(dashboard, /setIsManualFastTrackOpen\(true\)/);
  assert.match(modal, /setSearchQuery\(initialSearch\.trim\(\)\)/);
  assert.match(modal, /lead\.id,/);
  assert.match(modal, /handleCreateCase\(lead, activeCase\)/);
});
