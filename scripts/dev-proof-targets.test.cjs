const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const devWebBaseUrl = 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';

function readScript(filename) {
  return fs.readFileSync(path.join(__dirname, filename), 'utf8');
}

function resolveDevBaseUrlSource(source) {
  const match = source.match(/function resolveDevBaseUrl\(\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'resolveDevBaseUrl function should exist');
  return match[0];
}

test('public proof uses the Cloud Run compatible login route', () => {
  const source = readScript('public-proof.cjs');

  assert.match(source, /\{ id: 'PUB-002', route: '\/login\/'/);
  assert.doesNotMatch(source, /\{ id: 'PUB-002', route: '\/login'/);
  assert.match(source, /fs\.mkdirSync\(path\.dirname\(artifactPath\), \{ recursive: true \}\)/);
});

test('dev proof helpers default to deployed Cloud Run when FRONTEND_URL is absent', () => {
  const files = [
    'case-file-submit-proof.cjs',
    'direct-message-attachment-submit-proof.cjs',
    'e2e-batch-shared.cjs',
    'e2e-smoke.cjs',
    'manager-case-file-submit-proof.cjs',
    'manager-property-media-submit-proof.cjs',
    'support-attachment-submit-proof.cjs',
    'upload-picker-proof.cjs',
    'virtual-storage-submit-proof.cjs',
  ];

  for (const filename of files) {
    const source = readScript(filename);
    const functionSource = resolveDevBaseUrlSource(source);

    assert.match(source, new RegExp(`DEV_WEB_BASE_URL = ['"]${devWebBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`), filename);
    assert.match(functionSource, /DEV_WEB_BASE_URL/, filename);
    assert.doesNotMatch(functionSource, /localhost:3000/, filename);
  }
});

test('live catalog proof defaults to deployed Cloud Run when FRONTEND_URL is absent', () => {
  const source = readScript('live-1000-catalog-proof.cjs');

  assert.match(source, new RegExp(`DEV_WEB_BASE_URL = '${devWebBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  assert.match(source, /const baseUrl = process\.env\.E2E_DEV_BASE_URL[\s\S]*\|\| DEV_WEB_BASE_URL;/);
});
