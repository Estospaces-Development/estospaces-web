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

test('manager contract detail modal respects the manager shell chrome', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/pages/manager/contracts/page.tsx'),
        'utf8',
    );

    assert.match(source, /import \{ createPortal \} from 'react-dom';/);
    assert.match(source, /function renderManagerContractDetailPortal\(content: React\.ReactNode\)/);
    assert.match(source, /return createPortal\(content, document\.body\);/);
    assert.match(source, /const managerContractDetailOverlayStyle: React\.CSSProperties = \{\s*zIndex: 2147483647,/);
    assert.match(source, /top: 'var\(--workspace-header-height, 4rem\)'/);
    assert.match(source, /left: 'var\(--workspace-sidebar-offset, 0rem\)'/);
    assert.match(source, /viewContract && renderManagerContractDetailPortal\(/);
    assert.match(source, /className="fixed bottom-0 right-0 flex items-center justify-center bg-black\/60 p-4 backdrop-blur-sm"/);
    assert.match(source, /style=\{managerContractDetailOverlayStyle\}/);
    assert.doesNotMatch(source, /fixed inset-0 bg-black\/60 backdrop-blur-sm flex items-center justify-center z-\[9999\] p-4/);
});
