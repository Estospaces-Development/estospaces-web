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

test('login submit keeps the auth shell stable behind the global branded loader', () => {
  assert.match(loginPage, /import ActionSpinner from ['"]@\/components\/ui\/ActionSpinner['"]/);
  assert.match(loginPage, /import BrandLoadingScreen from ['"]@\/components\/ui\/BrandLoadingScreen['"]/);
  assert.match(loginPage, /aria-busy=\{loading\}/);
  assert.match(loginPage, /<ActionSpinner size="sm" aria-hidden \/>/);
  assert.match(loginPage, /\{loading \? <BrandLoadingScreen label="Signing you in\.\.\." \/> : null\}/);
  assert.match(loginPage, /if \(authLoading\) \{\s*return <BrandLoadingScreen label="Checking your session\.\.\." \/>;/);
  assert.doesNotMatch(loginPage, /<BrandLoader/);
});

test('login keeps the primary action reachable on short phone viewports', () => {
  assert.match(loginPage, /<AuthBrand className="!mb-4 sm:!mb-8"/);
  assert.match(loginPage, /Development QA sign-in\. Use an authorized test account\./);
  assert.match(loginPage, /mb-4 text-center text-sm[^"]+sm:mb-8/);
  assert.match(loginPage, /mb-4 text-right sm:mb-6/);
});
