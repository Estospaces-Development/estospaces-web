import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { parseRoleDocs } from './roleDocs';

const userGuide = readFileSync(resolve(process.cwd(), 'docs/user/USER-DASHBOARD-GUIDE.md'), 'utf8');
const managerGuide = readFileSync(resolve(process.cwd(), 'docs/manager/MANAGER-DASHBOARD-GUIDE.md'), 'utf8');
const roleDocsContent = readFileSync(resolve(process.cwd(), 'src/lib/roleDocsContent.ts'), 'utf8');

test('dashboard docs parse into current onboarding sections', () => {
    const userDocs = parseRoleDocs(userGuide);
    const managerDocs = parseRoleDocs(managerGuide);

    assert.deepEqual(
        userDocs.sections.map((section) => section.title),
        [
            'Start Here',
            'Dashboard Map',
            'Search And Property Choice',
            'Broker Request And Fast Track',
            'Documents, Case File, And Applications',
            'Contracts, Messages, Notifications, And Support',
            'User Troubleshooting',
        ],
    );
    assert.deepEqual(
        managerDocs.sections.map((section) => section.title),
        [
            'Start Here',
            'Manager Dashboard Map',
            'Readiness And Verification',
            'Property Inventory',
            'Leads, Shortlists, And 10-Minute Response',
            'Fast Track, Case Files, And Documents',
            'Applications, Appointments, Contracts, And Support',
            'Manager Troubleshooting',
        ],
    );
});

test('dashboard docs do not advertise inactive payment or billing routes', () => {
    const combined = `${userGuide}\n${managerGuide}\n${roleDocsContent}`.toLowerCase();

    assert.equal(combined.includes('/user/dashboard/payments'), false);
    assert.equal(combined.includes('/manager/billing'), false);
    assert.equal(combined.includes('payments page'), false);
    assert.equal(combined.includes('billing page'), false);
    assert.equal(combined.includes('payment context'), false);
    assert.equal(combined.includes('payment questions'), false);
});
