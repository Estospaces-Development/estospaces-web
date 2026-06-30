import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('manager contracts workspace exposes a visible page title before controls', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/pages/manager/contracts/page.tsx'),
        'utf8',
    );

    assert.match(source, /<h1[^>]*>\s*Contracts\s*<\/h1>/);
    assert.match(source, /Manage tenancy agreements, signatures, and handover readiness\./);
});

test('manager contracts workspace shows a clear invalid contract deep-link state', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/pages/manager/contracts/page.tsx'),
        'utf8',
    );

    assert.match(source, /const requestedContractId = String\(searchParams\.get\('contract'\) \|\| ''\)\.trim\(\);/);
    assert.match(source, /const hasInvalidRequestedContract = !loading && requestedContractId !== '' && !focusedContract;/);
    assert.match(source, /hasInvalidRequestedContract \? \[\] : contracts\.filter/);
    assert.match(source, /The requested contract was not found\./);
    assert.match(source, /Show all contracts/);
});

test('manager countersign keeps the open contract modal in sync after signing', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/pages/manager/contracts/page.tsx'),
        'utf8',
    );

    assert.match(source, /const latestContractResult = await getContract\(id, \{ suppressErrorToast: true \}\);/);
    assert.match(source, /const signedContract = latestContractResult\.data \|\| data;/);
    assert.match(source, /if \(signedContract\?\.manager_signed_at\) \{/);
    assert.match(source, /setContracts\(prev => prev\.map\(c => c\.id === id \? signedContract : c\)\);/);
    assert.match(source, /setViewContract\(current => current\?\.id === id \? signedContract : current\);/);
    assert.match(source, /\} else if \(error\) \{/);
});
