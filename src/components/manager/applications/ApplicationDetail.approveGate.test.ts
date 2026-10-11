import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const detail = readFileSync(new URL('./ApplicationDetail.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../../../pages/manager/applications/page.tsx', import.meta.url), 'utf8');

test('the header Approve button is disabled with a reason until the rent checks are done (E2E-f)', () => {
    assert.match(detail, /const headerApproveBlockedReason = getHeaderApproveBlockedReason\(\{\s*isRentApplication,\s*rentApprovalReady,\s*\}\);/);
    assert.match(
        detail,
        /aria-label="Approve application"[\s\S]{0,200}?disabled=\{managerDecisionAction !== null \|\| headerApproveBlockedReason !== null\}[\s\S]{0,80}?title=\{headerApproveBlockedReason \?\? undefined\}/,
    );
});

test('the manager applications page toasts a friendly status error instead of raw backend text (E2E-f)', () => {
    assert.match(page, /toast\.error\(formatApplicationStatusError\(err instanceof Error \? err\.message : null\)\)/);
});
