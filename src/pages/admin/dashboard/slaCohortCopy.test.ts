import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('admin dashboard explains the SLA compliance cohort', () => {
    const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    assert.match(source, /10-minute SLA; pending and manual leads excluded/);
    assert.doesNotMatch(source, /10-minute SLA success; pending leads excluded/);
});
