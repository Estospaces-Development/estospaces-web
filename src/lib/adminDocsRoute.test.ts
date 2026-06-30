import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

test('admin docs route opens the support queue instead of release guidance', () => {
    const adminRoutesBlock = appSource.slice(
        appSource.indexOf('{/* Admin Routes */}'),
        appSource.indexOf('{/* Manager Routes */}'),
    );

    assert.match(
        adminRoutesBlock,
        /<Route path="docs" element=\{<Navigate to="\/admin\/help" replace \/>\} \/>/,
    );
    assert.doesNotMatch(adminRoutesBlock, /release-operations/);
});
