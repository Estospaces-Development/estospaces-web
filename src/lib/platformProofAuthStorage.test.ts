import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const readProofScript = (name: string) => readFileSync(
  join(process.cwd(), 'scripts', name),
  'utf8',
);

test('browser proof scripts seed the current session token storage contract', () => {
  for (const scriptName of ['e2e-smoke.cjs', 'fast-track-redesign-proof.cjs']) {
    const source = readProofScript(scriptName);

    assert.match(
      source,
      /sessionStorage\.setItem\(["']esto_session_token["'], token\)/,
      `${scriptName} must seed the session-scoped auth token`,
    );
    assert.doesNotMatch(
      source,
      /localStorage\.setItem\(["']esto_token["'], token\)/,
      `${scriptName} must not seed the retired persistent token`,
    );
  }
});

test('Fast Track proof rejects optional analytics so consent cannot block controls', () => {
  const source = readProofScript('fast-track-redesign-proof.cjs');

  assert.match(
    source,
    /localStorage\.setItem\(["']estospaces_cookie_consent["'], ["']rejected["']\)/,
  );
});
