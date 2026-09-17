import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const verificationPage = readFileSync(
    resolve(process.cwd(), 'src/pages/admin/verifications/page.tsx'),
    'utf8',
);

test('manager verification view controls select visibly different responsive layouts', () => {
    assert.match(verificationPage, /onClick=\{\(\) => setViewMode\('grid'\)\}/);
    assert.match(verificationPage, /onClick=\{\(\) => setViewMode\('list'\)\}/);
    assert.match(verificationPage, /aria-pressed=\{viewMode === 'grid'\}/);
    assert.match(verificationPage, /aria-pressed=\{viewMode === 'list'\}/);
    assert.match(verificationPage, /data-verification-view-mode=\{viewMode\}/);
    assert.match(
        verificationPage,
        /viewMode === 'grid' \? 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6' : 'grid grid-cols-1 gap-4 sm:gap-6'/,
    );
    assert.match(verificationPage, /size=\{viewMode === 'grid' \? 'lg' : 'xl'\}/);
});
