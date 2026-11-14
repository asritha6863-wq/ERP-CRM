import * as XLSX from 'xlsx';

// Save rows (array of objects) as .xlsx
export function downloadRows(rows, filename = 'export.xlsx', sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename.replace(/\.csv$/i, '') + '.xlsx');
}

// Convert CSV text (as returned by export endpoints) to an .xlsx download. Cells stay as text.
export function downloadCsvAsExcel(csvText, filename = 'export.xlsx', sheetName = 'Sheet1') {
  const wb = XLSX.read(String(csvText).replace(/^\uFEFF/, ''), { type: 'string', raw: true });
  wb.SheetNames[0] = sheetName;
  wb.Sheets[sheetName] = wb.Sheets[Object.keys(wb.Sheets)[0]];
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename.replace(/\.csv$/i, '') + '.xlsx');
}

// Accepts an axios response/blob/text containing CSV
export async function downloadCsvResponseAsExcel(data, filename, sheetName) {
  const text = typeof data === 'string' ? data : await new Blob([data]).text();
  downloadCsvAsExcel(text, filename, sheetName);
}

export function downloadTemplate(fields, name = 'template') {
  const header = Object.fromEntries(fields.map((f) => [f.label.replace(/\s*\*$/, ''), '']));
  downloadRows([header], `${name}.xlsx`, 'Template');
}


