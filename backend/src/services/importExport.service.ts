import ExcelJS from 'exceljs';

export const IMPORT_TEMPLATE_COLUMNS = [
  { header: 'date (DD/MM/YYYY)', key: 'date', width: 18 },
  { header: 'documentNo', key: 'documentNo', width: 18 },
  { header: 'description', key: 'description', width: 40 },
  { header: 'amount', key: 'amount', width: 14 },
  { header: 'payee', key: 'payee', width: 20 },
  { header: 'paymentMethod (CASH/BANK_TRANSFER/CHEQUE/CREDIT_CARD/OTHER)', key: 'paymentMethod', width: 30 },
  { header: 'category (ชื่อหมวดงบประมาณตามที่มีอยู่ในโครงการ)', key: 'category', width: 30 },
  { header: 'workPackage (ถ้ามี)', key: 'workPackage', width: 30 },
];

export interface ParsedExpenseRow {
  rowNumber: number;
  date: string | null;
  documentNo: string;
  description: string;
  amount: number | null;
  payee: string;
  paymentMethod: string;
  category: string;
  workPackage: string;
}

export async function buildExpenseImportTemplate(): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('expenses');
  sheet.columns = IMPORT_TEMPLATE_COLUMNS;
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    date: '15/01/2569',
    documentNo: 'EXP-001',
    description: 'ตัวอย่างรายการ',
    amount: 1000,
    payee: 'ผู้รับเงินตัวอย่าง',
    paymentMethod: 'BANK_TRANSFER',
    category: 'หมวดค่าดำเนินงาน',
    workPackage: '',
  });
  return workbook.xlsx.writeBuffer();
}

/** Parses an uploaded .xlsx buffer (first worksheet, header row = row 1) into raw string/number rows. */
export async function parseExpenseImportExcel(buffer: Buffer): Promise<ParsedExpenseRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1).values as unknown[];
  const keyByColIndex = new Map<number, string>();
  IMPORT_TEMPLATE_COLUMNS.forEach((col) => {
    const idx = headerRow.findIndex((h) => typeof h === 'string' && h.startsWith(col.header.split(' ')[0]));
    if (idx > 0) keyByColIndex.set(idx, col.key);
  });
  // Fallback: assume columns are in template order starting at col 1
  if (keyByColIndex.size === 0) {
    IMPORT_TEMPLATE_COLUMNS.forEach((col, i) => keyByColIndex.set(i + 1, col.key));
  }

  const rows: ParsedExpenseRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, unknown> = {};
    keyByColIndex.forEach((key, colIdx) => {
      record[key] = row.getCell(colIdx).value;
    });
    if (!record.description && !record.amount) return; // skip blank rows

    rows.push({
      rowNumber,
      date: normalizeExcelDate(record.date),
      documentNo: String(record.documentNo ?? '').trim(),
      description: String(record.description ?? '').trim(),
      amount: typeof record.amount === 'number' ? record.amount : parseFloat(String(record.amount ?? '').replace(/,/g, '')) || null,
      payee: String(record.payee ?? '').trim(),
      paymentMethod: String(record.paymentMethod ?? 'BANK_TRANSFER').trim().toUpperCase(),
      category: String(record.category ?? '').trim(),
      workPackage: String(record.workPackage ?? '').trim(),
    });
  });

  return rows;
}

function normalizeExcelDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  // DD/MM/YYYY (supports พ.ศ. > 2400)
  const m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year > 2400) year -= 543;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
