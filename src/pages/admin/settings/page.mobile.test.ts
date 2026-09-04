import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/admin/settings/page.tsx'), 'utf8');

test('unchanged admin settings explain why save is disabled', () => {
    assert.match(source, /title=\{!hasSettingsChanges \? 'No settings changes to save'/);
    assert.match(source, /disabled:hover:bg-orange-500/);
    assert.match(source, /disabled:active:scale-100/);
});
