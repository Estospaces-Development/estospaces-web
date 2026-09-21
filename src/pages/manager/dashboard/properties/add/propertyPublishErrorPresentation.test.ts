import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

test('property publish errors remain visible below the workspace header', () => {
  assert.match(source, /toast\.visible && toast\.type === "error"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /Property needs attention/);
  assert.match(source, /fixed inset-x-3 top-\[calc\(env\(safe-area-inset-top\)\+4rem\+0\.75rem\)\] z-\[60\]/);
});
