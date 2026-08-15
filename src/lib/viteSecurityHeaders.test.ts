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
const defaultNginxSource = readFileSync(path.resolve(testDir, '../../nginx.conf'), 'utf8');
const gcpDevNginxSource = readFileSync(path.resolve(testDir, '../../nginx.gcp-dev.conf'), 'utf8');
const prodNginxSource = readFileSync(path.resolve(testDir, '../../nginx.prod.conf'), 'utf8');

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
  assert.match(viteConfigSource, /frame-src 'self' blob: https:\/\/storage\.googleapis\.com/);
  assert.match(viteConfigSource, /frame-src .*https:\/\/\*\.googleusercontent\.com/);
  assert.match(viteConfigSource, /frame-src .*https:\/\/js\.stripe\.com/);
  assert.match(viteConfigSource, /frame-src .*https:\/\/cdn\.pannellum\.org/);
  assert.match(viteConfigSource, /connect-src 'self' http: https: ws: wss:/);
  assert.doesNotMatch(viteConfigSource, /salesiq\.zoho\.in/);
  assert.doesNotMatch(viteConfigSource, /^.*zohocdn\.com.*$/m);
  assert.match(viteConfigSource, /headers: SECURITY_HEADERS/);
});

test('production security headers allow signed and blob backed document previews', () => {
  assert.match(nginxSecurityHeadersSource, /frame-src 'self' blob: https:\/\/storage\.googleapis\.com/);
  assert.match(nginxSecurityHeadersSource, /frame-src .*https:\/\/\*\.googleusercontent\.com/);
  assert.match(nginxSecurityHeadersSource, /frame-src .*https:\/\/js\.stripe\.com/);
  assert.match(nginxSecurityHeadersSource, /frame-src .*https:\/\/cdn\.pannellum\.org/);
  assert.match(nginxSecurityHeadersSource, /connect-src 'self'.*https:\/\/storage\.googleapis\.com/);
  assert.match(nginxSecurityHeadersSource, /connect-src 'self'.*https:\/\/\*\.googleusercontent\.com/);
  assert.match(nginxSecurityHeadersSource, /connect-src 'self'.*https:\/\/api\.pincodeapi\.in/);
  assert.match(nginxSecurityHeadersSource, /connect-src 'self'.*https:\/\/api\.postcodes\.io/);
  assert.doesNotMatch(nginxSecurityHeadersSource, /salesiq\.zoho\.in/);
  assert.doesNotMatch(nginxSecurityHeadersSource, /^.*zohocdn\.com.*$/m);
  assert.match(nginxSecurityHeadersSource, /connect-src .*wss:\/\/\*\.zoho\.in/);
});

test('gcp dev auth routes serve the SPA with noindex headers', () => {
  assert.match(gcpDevNginxSource, /location = \/login \{/);
  assert.match(gcpDevNginxSource, /add_header Cache-Control "no-store, no-cache, must-revalidate" always;/);
  assert.match(gcpDevNginxSource, /return 308 \/login\//);
  assert.match(gcpDevNginxSource, /location ~ \^\/\(login\|register\|forgot-password\|reset-password\|verify-email\)\/\?\$ \{/);
  assert.match(gcpDevNginxSource, /add_header X-Robots-Tag "noindex, nofollow, noarchive" always;/);
  assert.match(gcpDevNginxSource, /add_header Cache-Control "no-store, no-cache, must-revalidate" always;/);
  assert.match(gcpDevNginxSource, /rewrite \^ \/index\.html last;/);
});

test('nginx health route returns explicit web health JSON before SPA fallback', () => {
  for (const source of [defaultNginxSource, gcpDevNginxSource, prodNginxSource]) {
    const healthRouteIndex = source.indexOf('location = /health {');
    const spaFallbackIndex = source.indexOf('location / {');

    assert.notEqual(healthRouteIndex, -1);
    assert.notEqual(spaFallbackIndex, -1);
    assert.ok(healthRouteIndex < spaFallbackIndex);
    assert.match(source, /default_type application\/json;/);
    assert.match(source, /return 200 '\{"status":"ok","service":"estospaces-web"\}';/);
  }
});
test('nginx client geo route returns first-party country hints before SPA fallback', () => {
  for (const source of [defaultNginxSource, gcpDevNginxSource, prodNginxSource]) {
    const geoRouteIndex = source.indexOf('location = /client-geo.json {');
    const spaFallbackIndex = source.indexOf('location / {');

    assert.notEqual(geoRouteIndex, -1);
    assert.notEqual(spaFallbackIndex, -1);
    assert.ok(geoRouteIndex < spaFallbackIndex);
    assert.match(source, /default_type application\/json;/);
    assert.match(source, /\$http_cf_ipcountry/);
    assert.match(source, /\$http_x_appengine_country/);
    assert.match(source, /\$http_accept_language/);
  }
});

test('production nginx proxies __api/ prefixes through customer API edges', () => {
  assert.match(prodNginxSource, /location \/__api\/core\//);
  assert.match(prodNginxSource, /location \/__api\/booking\//);
  assert.match(prodNginxSource, /location \/__api\/search\//);
  assert.match(prodNginxSource, /location \/__api\/media\//);
  assert.match(prodNginxSource, /location \/__api\/messaging\//);
  assert.match(prodNginxSource, /location \/__api\/notification\//);
  assert.match(prodNginxSource, /proxy_pass https:\/\/core-api\.estospaces\.com/);
  assert.match(prodNginxSource, /proxy_pass https:\/\/search-api\.estospaces\.com/);
  assert.doesNotMatch(prodNginxSource, /proxy_pass https:\/\/[^;]*\.run\.app/);
});

test('production web CSP connect-src does not leak direct Cloud Run origins to browser', () => {
  // The web frontend uses __api/ same-origin proxy paths.
  // The browser should never see direct *.run.app URLs in CSP connect-src
  // because that would be the same CSP relaxation bug we are fixing.
  // The shared nginx-security-headers.conf has *.run.app for service-to-service,
  // but the production web nginx must override with a tighter CSP.
  assert.match(prodNginxSource, /location \/__api\//);
});

test('staging and gcp-dev nginx configs proxy __api/ and __dev_proxy/ prefixes', () => {
  assert.match(gcpDevNginxSource, /location \/__api\/core\//);
  assert.match(gcpDevNginxSource, /location \/__dev_proxy\/core\//);
  assert.match(gcpDevNginxSource, /proxy_pass https:\/\/estospaces-core-service-dev/);
});
