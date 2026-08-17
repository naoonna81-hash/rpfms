import ExcelJS from 'exceljs';
import { Response } from 'express';

export interface ColumnDef {
  header: string;
  key: string;
  width?: number;
}

export async function streamExcel(
  res: Response,
  filename: string,
  sheetName: string,
  columns: ColumnDef[],
  rows: Record<string, unknown>[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RPFMS';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}
