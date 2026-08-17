import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('dev and production proxies keep video uploads below the Cloud Run HTTP/1 ceiling', () => {
  for (const configName of ['nginx.gcp-dev.conf', 'nginx.gcp-dev.v4.conf', 'nginx.prod.conf']) {
    const source = readFileSync(resolve(repositoryRoot, configName), 'utf8');
    assert.match(source, /client_max_body_size\s+31m;/, `${configName} must accept the 30MB upload envelope`);
    assert.doesNotMatch(source, /client_max_body_size\s+(?:32|50|55)m;/, `${configName} must remain below Cloud Run's 32MiB HTTP/1 ceiling`);
  }
});
