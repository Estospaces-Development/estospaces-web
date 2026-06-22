import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCsvContent, formatCsvCell } from './csvExport';

test('formatCsvCell quotes, escapes, and guards spreadsheet formula prefixes', () => {
    assert.equal(formatCsvCell('A "quoted", value'), '"A ""quoted"", value"');
    assert.equal(formatCsvCell('=cmd|danger'), '"\'=cmd|danger"');
    assert.equal(formatCsvCell('+SUM(A1:A2)'), '"\'+SUM(A1:A2)"');
    assert.equal(formatCsvCell('-10'), '"\'-10"');
    assert.equal(formatCsvCell('@handle'), '"\'@handle"');
});

test('buildCsvContent serializes all rows through the same safe cell path', () => {
    const csv = buildCsvContent([
        ['Name', 'Email'],
        ['Ada, Test', '@danger.example'],
        ['Line\nBreak', 'safe@example.com'],
    ]);

    assert.equal(
        csv,
        '"Name","Email"\n"Ada, Test","\'@danger.example"\n"Line\nBreak","safe@example.com"',
    );
});
