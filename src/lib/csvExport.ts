export function formatCsvCell(value: unknown) {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) {
        text = `'${text}`;
    }
    return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsvContent(rows: unknown[][]) {
    return rows
        .map((row) => row.map(formatCsvCell).join(','))
        .join('\n');
}
