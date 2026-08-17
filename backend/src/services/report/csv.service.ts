import { Response } from 'express';

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Streams rows as CSV directly to the response. Writes a UTF-8 BOM so Thai text opens correctly in Excel. */
export function streamCsv(res: Response, filename: string, headers: string[], rows: unknown[][]) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.write('﻿');
  res.write(headers.map(escapeCsvCell).join(',') + '\n');
  for (const row of rows) {
    res.write(row.map(escapeCsvCell).join(',') + '\n');
  }
  res.end();
}
