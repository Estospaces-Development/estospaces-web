import { saveAs } from 'file-saver';
import writeExcelFile from 'write-excel-file/browser';

import { buildCsvContent } from '@/lib/csvExport';

interface ExportData {
    headers: string[];
    rows: (string | number)[][];
    title: string;
}

const PAGE_MARGIN = 40;
const ROW_HEIGHT = 16;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const HELVETICA_WIDTHS: Record<string, number> = {
    ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191,
    '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
    ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015, '[': 278,
    '\\': 278, ']': 278, '^': 469, '_': 556, '`': 333, '{': 334, '|': 260, '}': 334, '~': 584,
    A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278,
    J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
    S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
    a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222,
    j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333,
    s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
};
const HELVETICA_BOLD_WIDTHS: Record<string, number> = {
    ' ': 278, '!': 333, '"': 474, '#': 556, '$': 556, '%': 889, '&': 722, "'": 238,
    '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
    ':': 333, ';': 333, '<': 584, '=': 584, '>': 584, '?': 611, '@': 975, '[': 333,
    '\\': 278, ']': 333, '^': 584, '_': 556, '`': 333, '{': 389, '|': 280, '}': 389, '~': 584,
    A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278,
    J: 556, K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
    S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
    a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278,
    j: 278, k: 556, l: 278, m: 889, n: 611, o: 611, p: 611, q: 611, r: 389,
    s: 556, t: 333, u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
};

const formatCell = (value: string | number) => String(value ?? '').replace(/\s+/g, ' ').trim();
const serializeRow = (row: (string | number)[]) => row.map(formatCell).join(' | ');
const downloadBlob = (blob: Blob, filename: string) => saveAs(blob, filename);

interface PDFLine {
    text: string;
    bold: boolean;
    orange: boolean;
    size: number;
    y: number;
}

const PDF_TEXT_REPLACEMENTS: Readonly<Record<string, string>> = {
    '£': 'GBP ',
    '€': 'EUR ',
    '₹': 'INR ',
    '¥': 'YEN ',
    '₩': 'KRW ',
    '₽': 'RUB ',
    '₺': 'TRY ',
    '©': '(c)',
    '®': '(R)',
    '™': 'TM',
    '–': '-',
    '—': '-',
    '‘': "'",
    '’': "'",
    '“': '"',
    '”': '"',
    '…': '...',
    '•': '-',
    '°': ' deg ',
    '×': 'x',
    '÷': '/',
    '≤': '<=',
    '≥': '>=',
};

const normalizePDFText = (value: string) => Array.from(value)
    .map((character) => PDF_TEXT_REPLACEMENTS[character] ?? character)
    .join('')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/gu, (character) => `[U+${character.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}]`);

const escapePDFText = (value: string) => value.replace(/([\\()])/g, '\\$1');

const measurePDFText = (value: string, size: number, bold: boolean) => {
    const widths = bold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
    return [...value].reduce(
    (width, character) => width + (widths[character] ?? (/\d/.test(character) ? 556 : 600)),
    0,
) * size / 1000;
};

const splitPDFToken = (token: string, size: number, maxWidth: number, bold: boolean) => {
    const parts: string[] = [];
    let part = '';
    [...token].forEach((character) => {
        if (part && measurePDFText(`${part}${character}`, size, bold) > maxWidth) {
            parts.push(part);
            part = character;
            return;
        }
        part += character;
    });
    if (part) parts.push(part);
    return parts.length > 0 ? parts : [''];
};

const wrapPDFText = (value: string, size: number, bold: boolean) => {
    const maxWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
    const words = value.split(' ');
    const lines: string[] = [];
    let line = '';

    words.forEach((word) => {
        splitPDFToken(word, size, maxWidth, bold).forEach((part) => {
            const candidate = line ? `${line} ${part}` : part;
            if (measurePDFText(candidate, size, bold) <= maxWidth) {
                line = candidate;
                return;
            }
            if (line) lines.push(line);
            line = part;
        });
    });
    if (line) lines.push(line);
    return lines.length > 0 ? lines : [''];
};

export const buildPDFBlob = (data: ExportData) => {
    const pages: PDFLine[][] = [[]];
    let y = PAGE_HEIGHT - PAGE_MARGIN;

    const addLine = (text: string, options?: { bold?: boolean; orange?: boolean; size?: number }) => {
        const size = options?.size ?? 10;
        const bold = options?.bold ?? false;
        wrapPDFText(normalizePDFText(text), size, bold).forEach((wrappedLine) => {
            if (y < PAGE_MARGIN) {
                pages.push([]);
                y = PAGE_HEIGHT - PAGE_MARGIN;
            }
            pages.at(-1)?.push({
                text: wrappedLine,
                bold,
                orange: options?.orange ?? false,
                size,
                y,
            });
            y -= size === 16 ? 28 : ROW_HEIGHT;
        });
    };

    addLine(data.title, { bold: true, orange: true, size: 16 });
    addLine(serializeRow(data.headers), { bold: true });
    data.rows.forEach((row) => addLine(serializeRow(row)));

    const pageObjectIDs = pages.map((_, index) => 3 + index * 2);
    const fontObjectID = 3 + pages.length * 2;
    const boldFontObjectID = fontObjectID + 1;
    const objects: string[] = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        `<< /Type /Pages /Kids [${pageObjectIDs.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    ];

    pages.forEach((lines, index) => {
        const contentObjectID = pageObjectIDs[index] + 1;
        const stream = lines.map((line) => [
            'BT',
            `/${line.bold ? 'F2' : 'F1'} ${line.size} Tf`,
            line.orange ? '1 0.42 0.21 rg' : '0.12 0.14 0.18 rg',
            `1 0 0 1 ${PAGE_MARGIN} ${line.y.toFixed(2)} Tm`,
            `(${escapePDFText(line.text)}) Tj`,
            'ET',
        ].join('\n')).join('\n');
        objects.push(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectID} 0 R /F2 ${boldFontObjectID} 0 R >> >> /Contents ${contentObjectID} 0 R >>`,
            `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
        );
    });
    objects.push(
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    );

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
        pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
};

export const exportToPDF = async (data: ExportData, filename: string = 'export') => {
    downloadBlob(buildPDFBlob(data), `${filename}.pdf`);
};

export const buildExcelBlob = async (data: ExportData) => {
    const rows = [
        data.headers.map((value) => ({
            value: formatCell(value),
            fontWeight: 'bold' as const,
            backgroundColor: '#FF6B36',
            textColor: '#FFFFFF',
        })),
        ...data.rows.map((row) => row.map((value) => ({ value: formatCell(value) }))),
    ];
    const blob = await writeExcelFile(rows, {
        columns: data.headers.map(() => ({ width: 20 })),
    }).toBlob();
    return blob;
};

export const exportToExcel = async (data: ExportData, filename: string = 'export') => {
    downloadBlob(await buildExcelBlob(data), `${filename}.xlsx`);
};

export const exportToCSV = (data: ExportData, filename: string = 'export') => {
    const csvContent = buildCsvContent([data.headers, ...data.rows]);

    downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
};
