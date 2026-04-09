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
  try {
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
  } catch {
    drawImagePlaceholder(doc, x, y, width, height, title, "Rasm formatini ochib bo'lmadi");
  }
}

export async function sendContestExpensePdf(res, rows, fileName = "contest-expenses.pdf") {
  const doc = new PDFDocument({ margin: 42, size: "A4", autoFirstPage: false });
  const safeRows = Array.isArray(rows) ? rows : [];
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  if (!safeRows.length) {
    doc.addPage();
    doc.fontSize(18).text("Konkurs harajatlari", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).text("Chop etish uchun yozuv topilmadi.", { align: "center" });
  } else {
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
  }

  const bufferPromise = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.end();
  const buffer = await bufferPromise;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
}

function formatMoneyWithCurrency(amount = 0, currency = "UZS") {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: currency || "UZS",
      maximumFractionDigits: 0
    }).format(value);
  } catch {
    return `${value.toLocaleString("uz-UZ")} ${currency || ""}`.trim();
  }
}

function travelExpenseCategoryLabel(value) {
  const map = {
    transport: "Transport",
    hamyon_toldirish: "Hamyon to'ldirish",
    taksi: "Taksi",
    restoran_va_kafelar: "Restoran va kafelar",
    karta_toldirish: "Karta to'ldirish",
    xarid: "Xarid",
    kategoriya_yoq: "Kategoriya yo'q"
  };
  return map[value] || "Kategoriya yo'q";
}

function travelExpenseTypeLabel(value) {
  return value === "kirim" ? "Kirim" : "Chiqim";
}

function drawTravelExpenseTableHeader(doc, startY, colX) {
  const rowHeight = 26;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .lineWidth(1)
    .fillColor("#eef4ff")
    .strokeColor("#d5deef")
    .rect(doc.page.margins.left, startY, tableWidth, rowHeight)
    .fillAndStroke();

  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(9);
  [
    ["ID", 0],
    ["Sana", 1],
    ["Kategoriya", 2],
    ["Nomi", 3],
    ["Turi", 4],
    ["Valyuta", 5],
    ["Summa", 6]
  ].forEach(([label, idx]) => {
    doc.text(label, colX[idx] + 6, startY + 8, {
      width: colX[idx + 1] - colX[idx] - 12,
      align: idx === 6 ? "right" : "left"
    });
  });
  return startY + rowHeight;
}

export function sendTravelExpensePdf(res, rows, fileName = "travel-expenses.pdf", title = "Safar harajatlari hisobot") {
  const doc = new PDFDocument({ margin: 28, size: "A4", layout: "landscape" });
  const safeRows = Array.isArray(rows) ? rows : [];

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  doc.pipe(res);

  const totalExpense = safeRows.filter((row) => row.entry_type !== "kirim").length;
  const totalIncome = safeRows.filter((row) => row.entry_type === "kirim").length;

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#0f172a").text(title, { align: "center" });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10).fillColor("#64748b").text("Safar bo'yicha chiqim va kirimlar ro'yxati", { align: "center" });
  doc.moveDown(1);

  const summaryTop = doc.y;
  const summaryWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 20) / 3;
  [
    { label: "Yozuvlar soni", value: String(safeRows.length), tone: "#1d4ed8" },
    { label: "Chiqim yozuvlari", value: String(totalExpense), tone: "#dc2626" },
    { label: "Kirim yozuvlari", value: String(totalIncome), tone: "#16a34a" }
  ].forEach((item, idx) => {
    const x = doc.page.margins.left + idx * (summaryWidth + 10);
    doc
      .lineWidth(1)
      .fillColor("#f8fafc")
      .strokeColor("#dbe4f0")
      .roundedRect(x, summaryTop, summaryWidth, 56, 10)
      .fillAndStroke();
    doc.fillColor("#64748b").fontSize(9).font("Helvetica-Bold").text(item.label, x + 10, summaryTop + 10, { width: summaryWidth - 20 });
    doc.fillColor(item.tone).fontSize(13).font("Helvetica-Bold").text(item.value, x + 10, summaryTop + 28, { width: summaryWidth - 20 });
  });

  let cursorY = summaryTop + 78;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidths = [48, 80, 130, 255, 78, 70, 124];
  const colX = [
    doc.page.margins.left,
    doc.page.margins.left + columnWidths[0],
    doc.page.margins.left + columnWidths[0] + columnWidths[1],
    doc.page.margins.left + columnWidths[0] + columnWidths[1] + columnWidths[2],
    doc.page.margins.left + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3],
    doc.page.margins.left + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4],
    doc.page.margins.left + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5],
    doc.page.margins.left + tableWidth
  ];
  const rowHeight = 28;

  cursorY = drawTravelExpenseTableHeader(doc, cursorY, colX);

  if (!safeRows.length) {
    doc.font("Helvetica").fontSize(11).fillColor("#64748b").text("Hozircha safar harajatlari mavjud emas.", doc.page.margins.left, cursorY + 24, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      align: "center"
    });
  } else {
    safeRows.forEach((row, index) => {
      if (cursorY > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        cursorY = drawTravelExpenseTableHeader(doc, doc.page.margins.top, colX);
      }

      const fill = index % 2 === 0 ? "#ffffff" : "#f8fbff";
      doc
        .lineWidth(1)
        .fillColor(fill)
        .strokeColor("#e2e8f0")
        .rect(doc.page.margins.left, cursorY, tableWidth, rowHeight)
        .fillAndStroke();

      const cells = [
        `#${row.id}`,
        formatDateOnly(row.expense_date),
        travelExpenseCategoryLabel(row.category),
        row.title || "-",
        travelExpenseTypeLabel(row.entry_type),
        row.currency || "UZS",
        formatMoneyWithCurrency(row.amount, row.currency || "UZS")
      ];

      doc.font("Helvetica").fontSize(9).fillColor("#0f172a");
      cells.forEach((value, idx) => {
        doc.text(String(value), colX[idx] + 6, cursorY + 8, {
          width: colX[idx + 1] - colX[idx] - 12,
          align: idx === 6 ? "right" : "left",
          ellipsis: idx === 3
        });
      });

      cursorY += rowHeight;
    });
  }

  doc.moveDown(2);
  const noteY = Math.min(cursorY + 18, doc.page.height - doc.page.margins.bottom - 40);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("Izoh:", doc.page.margins.left, noteY);
  doc.font("Helvetica").fontSize(10).fillColor("#4b5563").text(
    "Quyida safar bo'yicha kiritilgan barcha chiqim va kirimlar jadval ko'rinishida aks ettirildi.",
    doc.page.margins.left + 36,
    noteY,
    { width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 36 }
  );

  doc.end();
}
