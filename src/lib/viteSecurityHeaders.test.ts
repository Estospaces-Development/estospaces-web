import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const viteConfigSource = readFileSync(path.resolve(testDir, '../../vite.config.mts'), 'utf8');
const nginxSecurityHeadersSource = readFileSync(
  path.resolve(testDir, '../../nginx-security-headers.conf'),
  'utf8',
);
const gcpDevNginxSource = readFileSync(path.resolve(testDir, '../../nginx.gcp-dev.conf'), 'utf8');

test('dev server sends the same release-blocking security headers as production', () => {
  assert.match(viteConfigSource, /'X-Frame-Options': 'DENY'/);
  assert.match(viteConfigSource, /'X-Content-Type-Options': 'nosniff'/);
  assert.match(viteConfigSource, /'Referrer-Policy': 'strict-origin-when-cross-origin'/);
  assert.match(viteConfigSource, /camera=\(\)/);
  assert.match(viteConfigSource, /geolocation=\(\)/);
  assert.match(viteConfigSource, /microphone=\(\)/);
  assert.match(viteConfigSource, /frame-ancestors 'none'/);
  assert.doesNotMatch(viteConfigSource, /unsafe-eval/);
  assert.match(viteConfigSource, /img-src 'self' data: blob: https: http:\/\/localhost:\* http:\/\/127\.0\.0\.1:\*/);
  assert.match(viteConfigSource, /frame-src 'self' blob: https:\/\/js\.stripe\.com/);
  assert.match(viteConfigSource, /frame-src .*https:\/\/cdn\.pannellum\.org/);
  assert.match(viteConfigSource, /connect-src 'self' http: https: ws: wss:/);
  assert.match(viteConfigSource, /headers: SECURITY_HEADERS/);
});

test('production security headers allow blob backed document previews', () => {
  assert.match(nginxSecurityHeadersSource, /frame-src 'self' blob: https:\/\/js\.stripe\.com/);
  assert.match(nginxSecurityHeadersSource, /frame-src .*https:\/\/cdn\.pannellum\.org/);
  assert.match(nginxSecurityHeadersSource, /connect-src 'self'.*https:\/\/storage\.googleapis\.com/);
  assert.match(nginxSecurityHeadersSource, /connect-src 'self'.*https:\/\/\*\.googleusercontent\.com/);
});

test('gcp dev exact login route serves the SPA with noindex headers', () => {
  assert.match(gcpDevNginxSource, /location = \/login \{/);
  assert.doesNotMatch(gcpDevNginxSource, /return 308 \/login\//);
  assert.match(gcpDevNginxSource, /add_header X-Robots-Tag "noindex, nofollow, noarchive" always;/);
  assert.match(gcpDevNginxSource, /add_header Cache-Control "no-store, no-cache, must-revalidate" always;/);
  assert.match(gcpDevNginxSource, /try_files \/index\.html =404;/);
});
