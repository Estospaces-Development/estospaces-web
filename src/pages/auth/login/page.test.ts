import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loginPage = readFileSync(resolve(process.cwd(), 'src/pages/auth/login/page.tsx'), 'utf8');
const globalStyles = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

test('login email field keeps app validation while allowing Browser text automation', () => {
  const emailInput = loginPage.match(/<input[\s\S]*?id="email"[\s\S]*?\/>/)?.[0] || '';

  assert.match(emailInput, /type="text"/);
  assert.match(emailInput, /inputMode="email"/);
  assert.match(emailInput, /autoComplete="email"/);
  assert.match(loginPage, /const validateEmail = \(value: string\) =>/);
  assert.match(loginPage, /\^\\S\+@\\S\+\\.\\S\+\$/);
});

test('password fields suppress native browser reveal controls', () => {
  assert.match(globalStyles, /input\[type="password"\]::-ms-reveal/);
  assert.match(globalStyles, /input\[type="password"\]::-ms-clear/);
  assert.match(globalStyles, /display:\s*none/);
});

test('login legal copy avoids mojibake separators', () => {
  assert.match(loginPage, /terms &amp; conditions<\/Link>\s*\{\s*' \| '\s*\}/);
  assert.doesNotMatch(loginPage, /Â|â|�|\\u00B7|·/);
});
