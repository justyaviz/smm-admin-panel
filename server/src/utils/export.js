import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

export function sendXlsx(res, rows, fileName = 'export.xlsx', sheetName = 'Data') {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
}

export function sendPdfTable(res, rows, title = 'Export', fileName = 'export.pdf') {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  doc.pipe(res);
  doc.fontSize(18).text(title, { underline: true });
  doc.moveDown();
  rows.forEach((row, idx) => {
    doc.fontSize(12).text(`${idx + 1}. ${JSON.stringify(row)}`);
    doc.moveDown(0.5);
  });
  doc.end();
}
