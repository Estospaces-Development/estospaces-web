import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('map-centre pin placement needs street-level zoom (MB-0208)', () => {
    const picker = read('components/manager/PropertyLocationPicker.tsx');
    assert.match(picker, /const MIN_CENTER_PLACEMENT_ZOOM = 15;/);
    assert.match(picker, /disabled=\{disabled \|\| !zoomedInEnough\}/);
});

test('the manager dashboard says when its figures failed to load (MB-0660)', () => {
    assert.match(read('pages/manager/dashboard/page.tsx'), /setAnalyticsFailed\(!\(analyticsRes\.status === 'fulfilled' && analyticsRes\.value\.data\)\);/);
});

test('a reservation without a recorded price is not shown as GBP 0 (MB-0535)', () => {
    const page = read('pages/user/bookings/page.tsx');
    assert.match(page, /: 'Price confirmed by the agent'/);
    assert.doesNotMatch(page, /\{booking\.currency\}\{booking\.total_amount\.toLocaleString\(\)\}/);
});
