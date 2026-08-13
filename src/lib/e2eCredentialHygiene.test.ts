import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const repositoryRoot = process.cwd();
const credentialConsumers = [
  'scripts/debug-support.cjs',
  'scripts/diagnostic-340-351.cjs',
  'scripts/live-1000-catalog-proof.cjs',
  'scripts/project5-155-183-dev-verification.cjs',
  'scripts/project5-live-fast-track-cross-role-proof.cjs',
  'scripts/project5-live-manager-add-property-proof.cjs',
  'scripts/project5-live-review-mutation-proof.cjs',
  'scripts/run-5k-smoke.cjs',
  'scripts/support-lifecycle-proof.cjs',
  'tests/e2e/session-isolation.spec.ts',
];

const forbiddenCredentialLiterals = [
  'dev-user-change-me',
  'dev-manager-change-me',
  'dev-admin-change-me',
  'Estospaces@123',
];

test('runnable browser proofs contain no shared password defaults', () => {
  for (const relativePath of credentialConsumers) {
    const source = readFileSync(join(repositoryRoot, relativePath), 'utf8');
    for (const forbiddenLiteral of forbiddenCredentialLiterals) {
      assert.equal(
        source.includes(forbiddenLiteral),
        false,
        `${relativePath} must not contain the shared credential literal ${forbiddenLiteral}`,
      );
    }
  }
});

test('runnable browser proofs fail closed through explicit E2E variables', () => {
  for (const relativePath of credentialConsumers) {
    const source = readFileSync(join(repositoryRoot, relativePath), 'utf8');
    assert.match(
      source,
      /E2E_(USER|MANAGER|ADMIN)_(EMAIL|PASSWORD)/,
      `${relativePath} must consume explicit E2E credentials`,
    );
  }
});
