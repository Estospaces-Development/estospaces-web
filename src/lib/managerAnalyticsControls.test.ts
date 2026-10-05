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

test('#491 manager analytics shows the monthly lead trend as counts, never as made-up revenue', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/pages/manager/analytics/page.tsx'),
        'utf8',
    );

    // Core sends new-lead counts in revenueTrend; there is no revenue data at launch.
    assert.match(source, />Lead Trend</);
    assert.match(source, /New leads per month over the last 6 months/);
    assert.doesNotMatch(source, /Revenue Analysis|Total Revenue|item\.value \* 1000|\$\$\{/);
    // The 6-month / yearly toggle could not change anything (core only returns 6 months).
    assert.doesNotMatch(source, /setTimeRange|Yearly|trend period/i);
});
