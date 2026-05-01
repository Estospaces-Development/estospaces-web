import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const viteConfigSource = readFileSync(path.resolve(testDir, '../../vite.config.mts'), 'utf8');

test('dev server sends the same release-blocking security headers as production', () => {
  assert.match(viteConfigSource, /'X-Frame-Options': 'DENY'/);
  assert.match(viteConfigSource, /'X-Content-Type-Options': 'nosniff'/);
  assert.match(viteConfigSource, /'Referrer-Policy': 'strict-origin-when-cross-origin'/);
  assert.match(viteConfigSource, /camera=\(\)/);
  assert.match(viteConfigSource, /geolocation=\(\)/);
  assert.match(viteConfigSource, /microphone=\(\)/);
  assert.match(viteConfigSource, /frame-ancestors 'none'/);
  assert.match(viteConfigSource, /img-src 'self' data: blob: https: http:\/\/localhost:\* http:\/\/127\.0\.0\.1:\*/);
  assert.match(viteConfigSource, /connect-src 'self' http: https: ws: wss:/);
  assert.match(viteConfigSource, /headers: SECURITY_HEADERS/);
});
