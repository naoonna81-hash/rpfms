import PDFDocument from 'pdfkit';
import { Response } from 'express';

export interface PdfTableColumn {
  header: string;
  key: string;
  width: number;
}

/**
 * Streams a simple tabular PDF report. Uses pdfkit's built-in Helvetica font (Thai glyphs
 * may not render with the default font on all platforms; this keeps the pipeline dependency-free.
 * Swap in a Thai TTF via doc.font(path) if a bundled font is added later.)
 */
export function streamPdfTable(
  res: Response,
  filename: string,
  title: string,
  columns: PdfTableColumn[],
  rows: unknown[][],
  meta?: string[]
) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  doc.pipe(res);

  doc.fontSize(16).text(title, { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#555');
  (meta ?? []).forEach((line) => doc.text(line));
  doc.fillColor('#000');
  doc.moveDown(0.5);

  const startX = doc.x;
  let y = doc.y;
  const rowHeight = 18;

  function drawHeader() {
    doc.fontSize(9).font('Helvetica-Bold');
    let x = startX;
    columns.forEach((col) => {
      doc.text(col.header, x, y, { width: col.width, ellipsis: true });
      x += col.width;
    });
    doc.font('Helvetica');
    y += rowHeight;
    doc.moveTo(startX, y - 4).lineTo(x, y - 4).strokeColor('#ccc').stroke();
  }

  drawHeader();

  doc.fontSize(8);
  rows.forEach((row) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.y;
      drawHeader();
    }
    let x = startX;
    row.forEach((cell, i) => {
      doc.text(cell === null || cell === undefined ? '' : String(cell), x, y, {
        width: columns[i].width,
        ellipsis: true,
      });
      x += columns[i].width;
    });
    y += rowHeight;
  });

  doc.end();
}
