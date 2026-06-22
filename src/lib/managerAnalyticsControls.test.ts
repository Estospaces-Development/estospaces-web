import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('manager analytics export control has an accessible name', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/pages/manager/analytics/page.tsx'),
        'utf8',
    );

    assert.match(source, /aria-label="Export analytics CSV"/);
    assert.match(source, /buildCsvContent/);
    assert.doesNotMatch(source, /item\.property\.replace/);
});

test('manager analytics uses build-safe Tailwind class maps for reporting colors', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/pages/manager/analytics/page.tsx'),
        'utf8',
    );

    assert.doesNotMatch(source, /\b(?:bg|text|border)-\$\{/);
    assert.match(source, /managerMetricColorClasses/);
    assert.match(source, /managerSummaryColorClasses/);
    assert.match(source, /managerFunnelColorClasses/);
});
