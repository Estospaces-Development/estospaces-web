import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Import autoTable dynamically
let autoTable: any;
if (typeof window !== 'undefined') {
    import('jspdf-autotable').then((module) => {
        autoTable = module.default;
    });
}

interface ExportData {
    headers: string[];
    rows: (string | number)[][];
    title: string;
}

export const exportToPDF = (data: ExportData, filename: string = 'export') => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(data.title, 14, 15);

    // Add table using jsPDF autoTable plugin
    (doc as any).autoTable({
        head: [data.headers],
        body: data.rows,
        startY: 25,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 107, 53] }, // Primary orange color
    });

    doc.save(`${filename}.pdf`);
};

export const exportToExcel = (data: ExportData, filename: string = 'export') => {
    const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Set column widths
    const colWidths = data.headers.map(() => ({ wch: 20 }));
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
};

export const exportToCSV = (data: ExportData, filename: string = 'export') => {
    const csvContent = [
        data.headers.join(','),
        ...data.rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
};
