import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export async function sendExcel(res, rows, fileName = "export.xlsx", sheetName = "Data") {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeRows.length) {
    const keys = Array.from(
      safeRows.reduce((set, row) => {
        Object.keys(row || {}).forEach((key) => set.add(key));
        return set;
      }, new Set())
    );

    worksheet.columns = keys.map((key) => ({
      header: key,
      key,
      width: Math.min(Math.max(String(key).length + 2, 14), 40)
    }));

    safeRows.forEach((row) => worksheet.addRow(row));

    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach((column) => {
      let maxLength = String(column.header || "").length;
      column.eachCell({ includeEmpty: true }, (cell) => {
        maxLength = Math.max(maxLength, String(cell.value ?? "").length);
      });
      column.width = Math.min(Math.max(maxLength + 2, 14), 40);
    });
  } else {
    worksheet.addRow(["No data"]);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(Buffer.from(buffer));
}

export function sendSimplePdf(res, title, rows, fileName = "export.pdf") {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  doc.pipe(res);

  doc.fontSize(18).text(title, { underline: true });
  doc.moveDown();

  rows.forEach((row, index) => {
    doc.fontSize(11).text(`${index + 1}. ${Object.entries(row).map(([k, v]) => `${k}: ${v ?? ""}`).join(" | ")}`);
    doc.moveDown(0.5);
  });

  doc.end();
}
