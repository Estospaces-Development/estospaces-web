import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

// MB-0196: Core refuses to delete a listing with active bookings (409) or when
// Booking cannot confirm it is free (503). The manager must see that reason.
test('the property context hands a refused delete back instead of dropping the listing', () => {
    const source = read('src/contexts/PropertyContext.tsx');
    assert.match(source, /deleteProperty: \(id: string\) => Promise<string \| null>;/);
    assert.match(source, /const \{ error \} = await propertyService\.deleteProperty\(id\);\s*(\/\/.*\s*)*if \(error\) return error;\s*setProperties/);
    // The unused bulk delete dropped refused listings from the list; it must not come back.
    assert.doesNotMatch(source, /deleteProperties/);
});

test('the inventory shows why a delete was refused', () => {
    const source = read('src/pages/manager/dashboard/properties/page.tsx');
    assert.match(source, /const deleteError = await deleteProperty\(pendingDeleteProperty\.id\);[\s\S]*?appToast\.error\(deleteError/);
});

test('the property detail stays open and shows why a delete was refused', () => {
    const source = read('src/pages/manager/dashboard/properties/[id]/page.tsx');
    assert.match(
        source,
        /const deleteError = await deleteProperty\(id\);\s*if \(deleteError\) \{\s*setToast\(\{ message: deleteError, type: 'error', visible: true \}\);\s*return;\s*\}\s*navigate\('\/manager\/dashboard\/properties'\);/,
    );
});
