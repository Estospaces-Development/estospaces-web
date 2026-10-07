import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('applications without their own Fast Track case upload to the document vault, not another case (MB-0488)', () => {
    const source = read('pages/user/applications/page.tsx');
    assert.match(source, /application\.fastTrackCaseId\s*\?\s*buildWorkspacePath\('\/user\/dashboard\/fast-track'/);
    assert.match(source, /:\s*'\/user\/dashboard\/profile#document-vault'/);
});

test('staged Fast Track files are cleared when the selected case changes (MB-0418)', () => {
    const source = read('components/fast-track/FastTrackWorkspace.tsx');
    assert.match(source, /const stagedFilesCaseId = selectedCase\?\.caseId \|\| '';\s*useEffect\(\(\) => \{\s*setSelectedFiles\(\{\}\);/);
    assert.match(source, /\}, \[stagedFilesCaseId\]\);/);
});

test('document reviews send the upload the reviewer saw (MB-0949)', () => {
    assert.match(read('components/fast-track/FastTrackWorkspace.tsx'), /reviewed_uploaded_at: item\.uploadedAt \|\| ''/);
});

test('admins cannot start deactivating their own account (MB-0626)', () => {
    const source = read('pages/admin/users/page.tsx');
    assert.equal(source.match(/disabled=\{actionBusy \|\| isSelfDeactivation\(user\)\}/g)?.length, 2);
});

test('managers can withdraw a contract nobody has fully signed (MB-0519)', () => {
    assert.match(read('services/contractsService.ts'), /\/api\/v1\/contracts\/\$\{id\}\/withdraw/);
    assert.match(read('pages/manager/contracts/page.tsx'), /onClick=\{\(\) => void handleWithdraw\(viewContract\)\}/);
});
