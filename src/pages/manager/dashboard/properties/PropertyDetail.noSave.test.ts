import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/manager/dashboard/properties/[id]/page.tsx'), 'utf8');

test('manager property detail does not offer the seeker-only Save control (#696)', () => {
    assert.doesNotMatch(source, /useSavedProperties/);
    assert.doesNotMatch(source, /aria-label=\{[^}]*'Save property'/);
    assert.doesNotMatch(source, /toggleProperty\(/);
});
