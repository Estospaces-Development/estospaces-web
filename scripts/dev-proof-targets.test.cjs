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

test('full platform performance proof rejects login errors and enforces the launch latency budget', () => {
  const source = readScript('full-platform-proof.cjs');

  assert.match(source, /`\$\{target\.appBaseUrl\}\/login\/`/);
  assert.match(source, /`\$\{target\.adminBaseUrl\}\/login\/`/);
  assert.doesNotMatch(source, /`\$\{target\.(?:app|admin)BaseUrl\}\/login`/);
  assert.match(source, /item\.status >= 200 && item\.status < 400/);
  assert.match(source, /appP95 <= applicationLatencyBudgetMs/);
  assert.match(source, /clientP95 <= remoteReachabilityBudgetMs/);
  assert.match(source, /const applicationLatencyBudgetMs = 1000/);
  assert.match(source, /const remoteReachabilityBudgetMs = 5000/);
  assert.match(source, /response\.headers\.get\('server-timing'\)/);
});

test('authenticated smoke proof uses the current canonical login route', () => {
  const source = readScript('e2e-smoke.cjs');

  assert.match(source, /return hostname\.endsWith\("\.run\.app"\) \? "\/login\/" : "\/login"/);
  assert.doesNotMatch(source, /sessions\/create/);
  assert.match(source, /const reportPath = path\.join\(screenshotRoot, "report\.json"\)/);
  assert.match(source, /fs\.writeFileSync\(reportPath, JSON\.stringify\(report, null, 2\)\)/);
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

test('important regression gate injects the current session-scoped auth token', () => {
  const source = readScript('manual-important-regression-gate.cjs');

  assert.match(source, /sessionStorage\.setItem\(['"]esto_session_token['"], token\)/);
  assert.doesNotMatch(source, /localStorage\.setItem\(['"]esto_token['"], token\)/);
  assert.match(source, /globalThis\.location\.origin === appOrigin/);
  assert.match(source, /appOrigin: new URL\(baseUrl\)\.origin/);
  assert.match(source, /['"]\/user\/dashboard\/saved['"]/);
  assert.match(source, /['"]\/user\/dashboard\/applications['"]/);
  assert.doesNotMatch(source, /['"]\/user\/(?:saved|applications)['"]/);
});

test('live catalog proof defaults to deployed Cloud Run when FRONTEND_URL is absent', () => {
  const source = readScript('live-1000-catalog-proof.cjs');

  assert.match(source, new RegExp(`DEV_WEB_BASE_URL = '${devWebBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  assert.match(source, /const baseUrl = process\.env\.E2E_DEV_BASE_URL[\s\S]*\|\| DEV_WEB_BASE_URL;/);
  assert.match(source, /const docPath = process\.env\.LIVE_1000_PLAN_PATH/);
  assert.match(source, /sessionStorage\.setItem\(['"]esto_session_token['"], token\)/);
  assert.match(source, /globalThis\.location\.origin === appOrigin/);
  assert.match(source, /appOrigin: new URL\(baseUrl\)\.origin/);
});
