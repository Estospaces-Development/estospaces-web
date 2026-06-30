import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { buildCsvContent } from '@/lib/csvExport';

interface ExportData {
    headers: string[];
    rows: (string | number)[][];
    title: string;
}

const PRIMARY_ORANGE = rgb(1, 0.42, 0.21);
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const ROW_HEIGHT = 16;

const formatCell = (value: string | number) => String(value ?? '').replace(/\s+/g, ' ').trim();
const serializeRow = (row: (string | number)[]) => row.map(formatCell).join(' | ');
const downloadBlob = (blob: Blob, filename: string) => saveAs(blob, filename);
const toBlobPart = (value: ArrayBuffer | Uint8Array<ArrayBufferLike>): BlobPart => {
    if (value instanceof ArrayBuffer) {
        return value;
    }

    const copy = new Uint8Array(value.byteLength);
    copy.set(value);
    return copy.buffer;
};

export const exportToPDF = async (data: ExportData, filename: string = 'export') => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

    let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - PAGE_MARGIN;

    const drawLine = (text: string, options?: { bold?: boolean; color?: ReturnType<typeof rgb>; size?: number }) => {
        const size = options?.size ?? 10;
        if (y < PAGE_MARGIN) {
            page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - PAGE_MARGIN;
        }
        page.drawText(text, {
            x: PAGE_MARGIN,
            y,
            size,
            font: options?.bold ? boldFont : font,
            color: options?.color ?? rgb(0.12, 0.14, 0.18),
            maxWidth: PAGE_WIDTH - PAGE_MARGIN * 2,
            lineHeight: ROW_HEIGHT,
        });
        y -= options?.size === 16 ? 28 : ROW_HEIGHT;
    };

    drawLine(data.title, { bold: true, color: PRIMARY_ORANGE, size: 16 });
    drawLine(serializeRow(data.headers), { bold: true });
    data.rows.forEach((row) => drawLine(serializeRow(row)));

    const pdfBytes = await pdf.save();
    downloadBlob(new Blob([toBlobPart(pdfBytes)], { type: 'application/pdf' }), `${filename}.pdf`);
};

export const exportToExcel = async (data: ExportData, filename: string = 'export') => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    worksheet.addRow(data.headers);
    data.rows.forEach((row) => worksheet.addRow(row.map(formatCell)));

    worksheet.columns = data.headers.map(() => ({ width: 20 }));
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF6B35' },
    };

    const excelBuffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
        new Blob([toBlobPart(excelBuffer)], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `${filename}.xlsx`,
    );
};

export const exportToCSV = (data: ExportData, filename: string = 'export') => {
    const csvContent = buildCsvContent([data.headers, ...data.rows]);

    downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
};
