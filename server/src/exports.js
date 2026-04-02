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

function formatDateOnly(value) {
  if (!value) return "-";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (value.includes("T")) return value.slice(0, 10);
    return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
}

async function loadImageBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const contentType = String(res.headers.get("content-type") || "");
    if (!contentType.startsWith("image/")) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

function drawKeyValueTable(doc, fields, startY) {
  const tableX = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const labelWidth = 150;
  const rowHeight = 28;

  fields.forEach(([label, value], index) => {
    const y = startY + index * rowHeight;
    doc
      .lineWidth(1)
      .strokeColor("#d6dbe7")
      .rect(tableX, y, labelWidth, rowHeight)
      .stroke();
    doc
      .rect(tableX + labelWidth, y, tableWidth - labelWidth, rowHeight)
      .stroke();
    doc
      .fillColor("#1f2937")
      .fontSize(10)
      .text(label, tableX + 8, y + 8, { width: labelWidth - 16 });
    doc
      .fillColor("#111827")
      .fontSize(10)
      .text(String(value || "-"), tableX + labelWidth + 8, y + 8, {
        width: tableWidth - labelWidth - 16
      });
  });

  return startY + fields.length * rowHeight;
}

function drawImagePlaceholder(doc, x, y, width, height, title, subtitle = "Rasm mavjud emas") {
  doc
    .lineWidth(1)
    .dash(5, { space: 3 })
    .strokeColor("#c7cfdd")
    .rect(x, y, width, height)
    .stroke()
    .undash();
  doc
    .fillColor("#6b7280")
    .fontSize(11)
    .text(title, x + 12, y + 18, { width: width - 24, align: "center" });
  doc
    .fontSize(9)
    .text(subtitle, x + 12, y + 40, { width: width - 24, align: "center" });
}

async function drawOptionalImage(doc, url, x, y, width, height, title) {
  const imageBuffer = await loadImageBuffer(url);
  if (!imageBuffer) {
    drawImagePlaceholder(doc, x, y, width, height, title);
    return;
  }

  doc
    .lineWidth(1)
    .strokeColor("#d6dbe7")
    .rect(x, y, width, height)
    .stroke();
  doc.image(imageBuffer, x + 6, y + 6, {
    fit: [width - 12, height - 12],
    align: "center",
    valign: "center"
  });
}

export async function sendContestExpensePdf(res, rows, fileName = "contest-expenses.pdf") {
  const doc = new PDFDocument({ margin: 42, size: "A4", autoFirstPage: false });
  const safeRows = Array.isArray(rows) ? rows : [];

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  doc.pipe(res);

  if (!safeRows.length) {
    doc.addPage();
    doc.fontSize(18).text("Konkurs harajatlari", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).text("Chop etish uchun yozuv topilmadi.", { align: "center" });
    doc.end();
    return;
  }

  for (const [index, row] of safeRows.entries()) {
    doc.addPage();

    doc
      .fillColor("#111827")
      .fontSize(18)
      .text(`HISOBOT No. ${index + 1}`, { align: "center" });
    doc
      .moveDown(0.25)
      .fontSize(11)
      .fillColor("#4b5563")
      .text("Konkurs harajatlari bo'yicha tasdiqlovchi hisobot", {
        align: "center"
      });

    const lineY = 96;
    doc
      .moveTo(doc.page.margins.left, lineY)
      .lineTo(doc.page.width - doc.page.margins.right, lineY)
      .lineWidth(1)
      .strokeColor("#cbd5e1")
      .stroke();

    const tableEndY = drawKeyValueTable(doc, [
      ["Sana", formatDateOnly(row.expense_date)],
      ["Konkurs nomi", row.contest_name],
      ["Sovga nomi", row.prize_name],
      ["Qayerga", row.winner_location],
      ["Viloyat", row.winner_region],
      ["Yutib olgan shaxs", row.winner_name],
      ["Telefon raqam", row.winner_phone]
    ], 118);

    doc
      .fillColor("#111827")
      .fontSize(11)
      .text("Sovga rasmi", doc.page.margins.left, tableEndY + 18);
    await drawOptionalImage(
      doc,
      row.prize_image_url,
      doc.page.margins.left,
      tableEndY + 38,
      170,
      120,
      "Sovga rasmi"
    );

    doc
      .fillColor("#111827")
      .fontSize(11)
      .text("Tasdiq uchun rasm", doc.page.margins.left, tableEndY + 176);
    await drawOptionalImage(
      doc,
      row.proof_image_url,
      doc.page.margins.left,
      tableEndY + 196,
      doc.page.width - doc.page.margins.left - doc.page.margins.right,
      260,
      "Tasdiq rasmi"
    );
  }

  doc.end();
}
