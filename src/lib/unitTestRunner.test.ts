import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';

const runner = resolve('scripts/run-unit-tests.cjs');
const dependencies = resolve('node_modules');

function runRouteFixture(shouldFail: boolean) {
  const temporaryRoot = resolve(tmpdir());
  const fixtureRoot = mkdtempSync(join(temporaryRoot, 'estospaces-runner-regression-'));
  try {
    const route = join(fixtureRoot, 'src', 'pages', '[id]');
    mkdirSync(route, { recursive: true });
    symlinkSync(dependencies, join(fixtureRoot, 'node_modules'), 'junction');
    writeFileSync(join(fixtureRoot, 'src', 'ordinary.test.ts'),
      "import test from 'node:test'; test('ordinary fixture executes', () => {});\n");
    writeFileSync(join(route, 'page.test.ts'),
      `import test from 'node:test'; import assert from 'node:assert/strict';
test('bracketed route fixture executes', () => { assert.equal(${shouldFail}, false); });\n`);
    return spawnSync(process.execPath, [runner], {
      cwd: fixtureRoot,
      // This exercises a fresh CLI invocation, not a nested node:test worker.
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
      encoding: 'utf8',
      timeout: 30000,
    });
  } finally {
    if (dirname(fixtureRoot) !== temporaryRoot || !basename(fixtureRoot).startsWith('estospaces-runner-regression-')) {
      throw new Error('Refusing cleanup outside the owned runner fixture');
    }
    // Remove the dependency junction itself before cleaning the owned fixtures.
    rmSync(join(fixtureRoot, 'node_modules'), { force: true, recursive: true });
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
}

test('unit runner executes bracketed route tests alongside ordinary tests', () => {
  const result = runRouteFixture(false);
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ok \d+ - bracketed route fixture executes/);
  assert.match(result.stdout, /ok \d+ - ordinary fixture executes/);
  assert.match(result.stdout, /# tests 2\b/);
});

test('unit runner fails when a bracketed route test fails', () => {
  const result = runRouteFixture(true);
  assert.ifError(result.error);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /not ok \d+ - bracketed route fixture executes/);
});
