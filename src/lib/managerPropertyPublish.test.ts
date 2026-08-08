import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const managerPropertyDetailPage = readFileSync(
    resolve(process.cwd(), 'src/pages/manager/dashboard/properties/[id]/page.tsx'),
    'utf8',
);

const managerPropertyEditorPage = readFileSync(
    resolve(process.cwd(), 'src/pages/manager/dashboard/properties/add/page.tsx'),
    'utf8',
);

test('ticket 421 removes the undocumented compliance panel from manager property screens', () => {
    assert.doesNotMatch(managerPropertyDetailPage, /PropertyCompliancePanel/);
    assert.doesNotMatch(managerPropertyEditorPage, /PropertyCompliancePanel/);
    assert.match(managerPropertyDetailPage, /onClick=\{handlePublish\}[\s\S]*?disabled=\{publishing\}/);
    assert.match(managerPropertyEditorPage, /Submit for Approval/);
});
