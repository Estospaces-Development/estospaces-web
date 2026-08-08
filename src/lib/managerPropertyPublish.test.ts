import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const managerPropertyDetailPage = readFileSync(
    resolve(process.cwd(), 'src/pages/manager/dashboard/properties/[id]/page.tsx'),
    'utf8',
);

test('ticket 421 keeps compliance evidence separate from listing publication', () => {
    assert.match(managerPropertyDetailPage, /<PropertyCompliancePanel[\s\S]*?propertyId=\{property\.id\}[\s\S]*?\/>/);
    assert.match(managerPropertyDetailPage, /onClick=\{handlePublish\}[\s\S]*?disabled=\{publishing\}/);
    assert.doesNotMatch(managerPropertyDetailPage, /compliancePublishBlocker/);
    assert.doesNotMatch(managerPropertyDetailPage, /Resolve compliance readiness before publishing/);
});

test('compliance panel copy does not present evidence as a publication prerequisite', () => {
    const compliancePanel = readFileSync(
        resolve(process.cwd(), 'src/components/dashboard/PropertyCompliancePanel.tsx'),
        'utf8',
    );

    assert.doesNotMatch(compliancePanel, /before publishing/i);
    assert.match(compliancePanel, /before progressing an offer or contract/);
});
