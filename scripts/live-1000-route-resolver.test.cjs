const assert = require('node:assert/strict');
const test = require('node:test');

const {
  extractVirtualTourIdFromUrl,
  normalizeRoute,
  rolesNeededForScenarios,
} = require('./live-1000-route-resolver.cjs');

test('extractVirtualTourIdFromUrl reads the share id from a public tour URL', () => {
  assert.equal(
    extractVirtualTourIdFromUrl('http://localhost:3001/virtual-tours/tour-123?source=qa'),
    'tour-123',
  );
});

test('normalizeRoute uses the virtual tour id for public virtual-tour routes', () => {
  assert.equal(
    normalizeRoute('/virtual-tours/:id', {
      propertyId: 'property-123',
      virtualTourId: 'tour-123',
    }),
    '/virtual-tours/tour-123',
  );
});

test('normalizeRoute keeps property ids for normal property routes', () => {
  assert.equal(
    normalizeRoute('/user/dashboard/property/:id', {
      propertyId: 'property-123',
      virtualTourId: 'tour-123',
    }),
    '/user/dashboard/property/property-123',
  );
});

test('rolesNeededForScenarios skips auth for public-only virtual-tour scenarios', () => {
  assert.deepEqual(
    rolesNeededForScenarios([
      {
        role: 'Public/Auth',
        routes: ['/virtual-tours/:id'],
      },
    ]),
    [],
  );
});

test('rolesNeededForScenarios collects every protected role in cross-role routes', () => {
  assert.deepEqual(
    rolesNeededForScenarios([
      {
        role: 'Cross-Role/System',
        routes: ['/manager/fast-track', '/user/dashboard/fast-track', '/admin/notifications'],
      },
    ]),
    ['admin', 'manager', 'user'],
  );
});
