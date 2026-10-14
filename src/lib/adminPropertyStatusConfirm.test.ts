import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { getAdminPropertyStatusConfirmCopy } from './adminPropertyStatusConfirm';

test('publish and suspend confirm copy names the listing and the effect', () => {
    const publish = getAdminPropertyStatusConfirmCopy('published', ' QA Flat ');
    assert.match(publish.message, /"QA Flat" will go live/);
    assert.equal(publish.confirmText, 'Approve and publish');
    const suspend = getAdminPropertyStatusConfirmCopy('suspended', null);
    assert.match(suspend.message, /"this listing" will be hidden/);
    assert.equal(suspend.variant, 'warning');
});

test('admin listing pages route publish/suspend through ConfirmModal, never straight to the API', () => {
    for (const file of ['src/pages/admin/properties/page.tsx', 'src/pages/admin/properties/[id]/page.tsx']) {
        const source = readFileSync(resolve(process.cwd(), file), 'utf8');
        assert.match(source, /<ConfirmModal/);
        assert.doesNotMatch(source, /onClick=\{[^}]*handleStatusChange\([^)]*'(published|suspended)'\)/);
    }
});
