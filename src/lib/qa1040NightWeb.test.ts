import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('manager application card and drawer show "Price on request", not £0, for a missing price', () => {
    const card = read('components/manager/applications/ApplicationCard.tsx');
    assert.match(card, /const hasPropertyPrice = Number\(application\.propertyPrice\) > 0;/);
    assert.match(card, /: 'Price on request';/);
    assert.doesNotMatch(card, /application\.propertyPrice \|\| 0/);
    assert.match(read('components/manager/applications/ApplicationDetail.tsx'), /if \(!\(Number\(price\) > 0\)\) return "Price on request";/);
});

test('user application drawer labels every status from the shared STATUS_CONFIG', () => {
    const page = read('pages/user/applications/page.tsx');
    assert.match(page, /const statusConfig = STATUS_CONFIG\[application\.status\];/);
    assert.doesNotMatch(page, /const statusMap: Record<string, \{ label: string; color: string \}>/);
});

test('document vault header counts re-upload documents the list shows', () => {
    const vault = read('components/dashboard/VerificationSection.tsx');
    assert.match(vault, /document\.status === 'reupload_required'\)\.length;/);
    assert.match(vault, /\{documentMetrics\.reupload\} re-upload/);
});
