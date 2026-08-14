import assert from 'node:assert/strict';
import test from 'node:test';
import { inflateRawSync } from 'node:zlib';

import { buildExcelBlob, buildPDFBlob } from './exportUtils';

const readZipEntries = (bytes: Uint8Array) => {
    const buffer = Buffer.from(bytes);
    let endOffset = buffer.length - 22;
    while (endOffset >= 0 && buffer.readUInt32LE(endOffset) !== 0x06054b50) endOffset -= 1;
    assert.ok(endOffset >= 0, 'XLSX should contain a ZIP end-of-central-directory record');

    const entryCount = buffer.readUInt16LE(endOffset + 10);
    let centralOffset = buffer.readUInt32LE(endOffset + 16);
    const entries = new Map<string, Buffer>();
    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
        assert.equal(buffer.readUInt32LE(centralOffset), 0x02014b50, 'XLSX should contain valid central entries');
        const compressionMethod = buffer.readUInt16LE(centralOffset + 10);
        const compressedSize = buffer.readUInt32LE(centralOffset + 20);
        const fileNameLength = buffer.readUInt16LE(centralOffset + 28);
        const extraLength = buffer.readUInt16LE(centralOffset + 30);
        const commentLength = buffer.readUInt16LE(centralOffset + 32);
        const localOffset = buffer.readUInt32LE(centralOffset + 42);
        const fileName = buffer.subarray(centralOffset + 46, centralOffset + 46 + fileNameLength).toString('utf8');

        assert.equal(buffer.readUInt32LE(localOffset), 0x04034b50, 'XLSX should contain valid local entries');
        const localFileNameLength = buffer.readUInt16LE(localOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localOffset + 28);
        const dataOffset = localOffset + 30 + localFileNameLength + localExtraLength;
        const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
        if (compressionMethod === 0) entries.set(fileName, Buffer.from(compressed));
        else if (compressionMethod === 8) entries.set(fileName, inflateRawSync(compressed));
        else assert.fail(`Unsupported XLSX ZIP compression method: ${compressionMethod}`);

        centralOffset += 46 + fileNameLength + extraLength + commentLength;
    }
    return entries;
};

test('buildPDFBlob creates a valid multi-page PDF with a correct cross-reference offset', async () => {
    const blob = buildPDFBlob({
        title: 'Launch report',
        headers: ['Property', 'Status'],
        rows: Array.from({ length: 70 }, (_, index) => [`Property ${index + 1}`, 'Ready']),
    });
    const pdf = await blob.text();

    assert.equal(blob.type, 'application/pdf');
    assert.match(pdf, /^%PDF-1\.4\n/);
    assert.match(pdf, /\/Type \/Pages \/Kids \[[^\]]+\] \/Count 2/);
    assert.match(pdf, /Launch report/);
    assert.match(pdf, /Helvetica-Bold/);
    assert.match(pdf, /%%EOF$/);

    const startXref = Number(pdf.match(/startxref\n(\d+)\n%%EOF$/)?.[1]);
    assert.equal(pdf.slice(startXref, startXref + 4), 'xref');
});

test('buildPDFBlob escapes PDF control characters in exported values', async () => {
    const pdf = await buildPDFBlob({
        title: 'Report (draft)',
        headers: ['Path'],
        rows: [['A\\B (ready)']],
    }).text();

    assert.ok(pdf.includes(String.raw`Report \(draft\)`));
    assert.ok(pdf.includes(String.raw`A\\B \(ready\)`));
});

test('buildPDFBlob preserves international values with readable PDF-safe text', async () => {
    const pdf = await buildPDFBlob({
        title: 'Café property prices',
        headers: ['India', 'United Kingdom', 'Europe', 'Owner'],
        rows: [['₹1,00,000', '£950', '€1,100', 'Zoë 東京 🏠']],
    }).text();

    assert.match(pdf, /Cafe property prices/);
    assert.match(pdf, /INR 1,00,000/);
    assert.match(pdf, /GBP 950/);
    assert.match(pdf, /EUR 1,100/);
    assert.match(pdf, /Zoe \[U\+6771\]\[U\+4EAC\] \[U\+1F3E0\]/);
    assert.doesNotMatch(pdf, /\?/);
});

test('buildPDFBlob wraps wide Helvetica text and splits overlong tokens inside the page width', async () => {
    const wideToken = 'W'.repeat(80);
    const pdf = await buildPDFBlob({
        title: 'Width-safe report',
        headers: ['Property'],
        rows: [[wideToken]],
    }).text();
    const renderedParts = [...pdf.matchAll(/\((W+)\) Tj/g)].map((match) => match[1]);

    assert.ok(renderedParts.length > 1, 'wide token should wrap across multiple PDF lines');
    assert.equal(renderedParts.join(''), wideToken);
    renderedParts.forEach((part) => {
        assert.ok(part.length <= 54, 'each Helvetica W segment should fit inside the usable page width');
    });
});

test('buildPDFBlob uses bold Helvetica widths when wrapping report titles', async () => {
    const boldToken = 'A'.repeat(80);
    const pdf = await buildPDFBlob({
        title: boldToken,
        headers: ['Property'],
        rows: [],
    }).text();
    const renderedParts = [...pdf.matchAll(/\((A+)\) Tj/g)].map((match) => match[1]);

    assert.ok(renderedParts.length > 1, 'bold title should wrap across multiple PDF lines');
    assert.equal(renderedParts.join(''), boldToken);
    renderedParts.forEach((part) => {
        assert.ok(part.length <= 44, 'each bold Helvetica A segment should fit inside the usable page width');
    });
});

test('buildExcelBlob creates a valid styled XLSX and preserves Unicode cell content', async () => {
    const blob = await buildExcelBlob({
        title: 'Property export',
        headers: ['Property', 'Price'],
        rows: [['Café 東京 🏠', '₹1,00,000']],
    });
    const entries = readZipEntries(new Uint8Array(await blob.arrayBuffer()));

    assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    for (const requiredEntry of [
        '[Content_Types].xml',
        'xl/workbook.xml',
        'xl/worksheets/sheet1.xml',
        'xl/styles.xml',
        'xl/sharedStrings.xml',
    ]) {
        assert.ok(entries.has(requiredEntry), `XLSX should contain ${requiredEntry}`);
    }

    const workbook = entries.get('xl/workbook.xml')?.toString('utf8') ?? '';
    const sharedStrings = entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
    const styles = entries.get('xl/styles.xml')?.toString('utf8') ?? '';
    const sheet = entries.get('xl/worksheets/sheet1.xml')?.toString('utf8') ?? '';
    assert.match(workbook, /name="Sheet1"/);
    assert.match(sharedStrings, /Café 東京 🏠/u);
    assert.match(sharedStrings, /₹1,00,000/u);
    assert.match(styles, /FF6B36/i, 'header background color should be encoded');
    assert.match(styles, /FFFFFF/i, 'header text color should be encoded');
    assert.match(sheet, /<row r="1"[^>]*>.*s="[1-9][0-9]*"/s, 'header cells should use a non-default style');
});
