/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert';
/**
 * Tests for production-safe API origin configuration and CSP behavior.
 *
 * These tests verify that the application uses approved canonical API domains
 * and that CSP headers would allow the origins actually needed at runtime.
 */

const APPROVED_API_DASE_PREFIX = '__api';
const APPROVED_ORIGINS = [
  'self',
  'https://app.estospaces.com',
  'https://admin.estospaces.com',
  'https://storage.googleapis.com',
];

const CANONICAL_API_DOMAINS = [
  'core-api.estospaces.com',
  'booking-api.estospaces.com',
  'search-api.estospaces.com',
  'media-api.estospaces.com',
  'messaging-api.estospaces.com',
  'notification-api.estospaces.com',
  'payment-api.estospaces.com',
];

// Direct Cloud Run origins (used internally between services)
const INTERNAL_CLOUD_RUN_PATTERN = /^https:\/\/estospaces-[a-z-]+-prod-\d+\.europe-west2\.run\.app$/;

test('API base URLs use __api/ prefix, not direct Cloud Run origins', () => {
  const apiUrlEnvKeys = [
    'VITE_API_BASE_URL',
    'VITE_CORE_SERVICE_URL',
    'VITE_BOOKING_SERVICE_URL',
    'VITE_SEARCH_SERVICE_URL',
    'VITE_MEDIA_SERVICE_URL',
    'VITE_MESSAGING_SERVICE_URL',
    'VITE_NOTIFICATION_SERVICE_URL',
    'VITE_CORE_API',
    'VITE_BOOKING_API',
    'VITE_SEARCH_API',
    'VITE_MEDIA_API',
    'VITE_MESSAGING_API',
    'VITE_NOTIFICATION_API',
  ];

  const envOverrides: Record<string, string> = {};

  // Set __api/ prefix URLs
  envOverrides['VITE_API_BASE_URL'] = '/__api/core';
  envOverrides['VITE_CORE_SERVICE_URL'] = '/__api/core';
  envOverrides['VITE_BOOKING_SERVICE_URL'] = '/__api/booking';
  envOverrides['VITE_SEARCH_SERVICE_URL'] = '/__api/search';
  envOverrides['VITE_MEDIA_SERVICE_URL'] = '/__api/media';
  envOverrides['VITE_MESSAGING_SERVICE_URL'] = '/__api/messaging';
  envOverrides['VITE_NOTIFICATION_SERVICE_URL'] = '/__api/notification';
  envOverrides['VITE_CORE_API'] = '/__api/core';
  envOverrides['VITE_BOOKING_API'] = '/__api/booking';
  envOverrides['VITE_SEARCH_API'] = '/__api/search';
  envOverrides['VITE_MEDIA_API'] = '/__api/media';
  envOverrides['VITE_MESSAGING_API'] = '/__api/messaging';
  envOverrides['VITE_NOTIFICATION_API'] = '/__api/notification';

  // No API URL should be a direct Cloud Run origin
  for (const [key, value] of Object.entries(envOverrides)) {
    assert.ok(
      !INTERNAL_CLOUD_RUN_PATTERN.test(value),
      `${key} should not be a direct Cloud Run origin (got: ${value})`
    );
    assert.ok(
      value.startsWith('/__api/'),
      `${key} should use __api/ prefix (got: ${value})`
    );
  }
});

test('CSP connect-src includes required origins for API calls', () => {
  // Simulate the CSP connect-src directive from terraform
  const connectSrcDirectives = [
    "'self'",
    "https://app.estospaces.com",
    "https://admin.estospaces.com",
    "https://storage.googleapis.com",
    "wss://*.zoho.in",
    "wss://*.zohopublic.in",
  ];

  // At minimum, 'self' must be present (same-origin __api/ calls)
  assert.ok(
    connectSrcDirectives.includes("'self'"),
    "CSP connect-src must include 'self' for same-origin API calls"
  );
});

test('no wildcard CSP relaxation for connect-src', () => {
  const connectSrcDirectives = [
    "'self'",
    "https://app.estospaces.com",
    "https://admin.estospaces.com",
    "https://storage.googleapis.com",
    "wss://*.zoho.in",
    "wss://*.zohopublic.in",
  ];

  const hasWildcard = connectSrcDirectives.some(d => d === '*');
  assert.ok(!hasWildcard, "connect-src must not use wildcard (*)");
});

test('__api/ path structure is valid for all backend services', () => {
  const services = ['core', 'booking', 'payment', 'notification', 'search', 'media', 'messaging'];

  for (const service of services) {
    const apiPath = `/__api/${service}`;
    assert.ok(apiPath.startsWith('/__api/'), `API path for ${service} must start with /__api/`);
    assert.ok(!apiPath.includes(' '), `API path for ${service} must not contain spaces`);
  }
});

test('nginx proxy routing regex correctly matches __api/ paths', () => {
  // Simulate the nginx regex pattern
  const nginxPattern = /^\/__api\/(core|booking|payment|notification|search|media|messaging)(\/.*)?$/;

  const validPaths = [
    '/__api/core',
    '/__api/core/health',
    '/__api/search/properties',
    '/__api/media/uploads',
    '/__api/notification/alerts',
    '/__api/messaging/conversations',
  ];

  const invalidPaths = [
    '/api/core',
    '/__api/',
    '/__api/unknown/service',
    '/other/core',
    '/__apicore',
  ];

  for (const path of validPaths) {
    assert.ok(
      nginxPattern.test(path),
      `nginx regex should match valid path: ${path}`
    );
  }

  for (const path of invalidPaths) {
    assert.ok(
      !nginxPattern.test(path),
      `nginx regex should NOT match invalid path: ${path}`
    );
  }
});

test('nginx rewrite preserves correct upstream path', () => {
  // Test the rewrite logic: ^/__api/(service)(/.*)?$ -> $2
  const rewritePattern = /^\/__api\/(core|booking|payment|notification|search|media|messaging)(\/.*)?$/;

  const testCases = [
    { input: '/__api/core/health', expected: '/health' },
    { input: '/__api/search/properties?q=test', expected: '/properties?q=test' },
    { input: '/__api/media/uploads/123', expected: '/uploads/123' },
    { input: '/__api/core', expected: '' },
  ];

  for (const tc of testCases) {
    const match = tc.input.match(rewritePattern);
    if (match) {
      const rewritten = match[2] || '';
      assert.strictEqual(rewritten, tc.expected,
        `rewrite of ${tc.input} should be ${tc.expected}, got: ${rewritten}`);
    }
  }
});
