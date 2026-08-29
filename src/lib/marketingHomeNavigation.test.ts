import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
const loginSource = fs.readFileSync(path.join(process.cwd(), 'src/pages/auth/login/page.tsx'), 'utf8');

test('legacy application home route redirects to the official marketing website', () => {
  assert.match(appSource, /window\.location\.replace\(getPublicHomeHref\(\)\)/);
  assert.match(appSource, /<Route path="home" element=\{<MarketingHomeRedirect \/>\} \/>/);
  assert.doesNotMatch(appSource, /<Route path="home" element=\{<HomePage \/>\} \/>/);
  assert.doesNotMatch(appSource, /pages\/public\/home\/page/);
});

test('login home action clearly identifies the official website destination', () => {
  assert.match(loginSource, /Visit Estospaces\.com/);
  assert.doesNotMatch(loginSource, />\s*Back to Home\s*</);
});
