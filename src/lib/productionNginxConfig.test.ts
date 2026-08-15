import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync(new URL('../../nginx.prod.conf', import.meta.url), 'utf8');

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
