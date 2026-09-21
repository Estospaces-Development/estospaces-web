import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync(new URL('../../nginx.prod.conf', import.meta.url), 'utf8');
const developmentConfig = readFileSync(new URL('../../nginx.gcp-dev.conf', import.meta.url), 'utf8');

test('production nginx proxies every same-origin API prefix through the public production edge', () => {
  const services = ['core', 'booking', 'payment', 'notification', 'search', 'media', 'messaging'];

  for (const service of services) {
    assert.match(config, new RegExp(`location /__api/${service}/`));
    assert.match(config, new RegExp(`proxy_pass https://${service}-api\\.estospaces\\.com/;`));
  }
  assert.doesNotMatch(config, /-dev-|a\.run\.app|__dev_proxy/);
});

test('production nginx exposes the strict web health identity', () => {
  assert.match(config, /location = \/health/);
  assert.match(config, /\{"status":"ok","service":"estospaces-web"\}/);
});

test('hosted login routes render the SPA without redirecting to the internal port', () => {
  for (const hostedConfig of [config, developmentConfig]) {
    assert.doesNotMatch(hostedConfig, /return\s+30[1278]\s+\/login\/?/);
    assert.match(hostedConfig, /location ~ \^\/\(login\|register\|forgot-password\|reset-password\|verify-email\)\/?\?\$ \{[\s\S]*?(try_files \/index\.html =404;|rewrite \^ \/index\.html last;)/);
  }
  assert.match(developmentConfig, /location = \/login\s*\{[\s\S]*?rewrite \^ \/index\.html last;/);
});
