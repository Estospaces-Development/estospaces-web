import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/manager/dashboard/properties/[id]/page.tsx'), 'utf8');

test('manager property detail header builds its address with the shared formatter (#697)', () => {
    assert.match(source, /formatLaunchPropertyLocation\(\[/);
    // The raw template printed ", ," for an empty state and the stored "IN" code.
    assert.doesNotMatch(source, /\{property\.location\?\.addressLine1 \|\| property\.address\}, \{property\.location\?\.city/);
});
