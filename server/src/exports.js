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

function getMonthTitle(monthLabel) {
  const [year, month] = String(monthLabel || "").split("-");
  const names = {
    "01": "Yanvar",
    "02": "Fevral",
    "03": "Mart",
    "04": "Aprel",
    "05": "May",
    "06": "Iyun",
    "07": "Iyul",
    "08": "Avgust",
    "09": "Sentabr",
    "10": "Oktabr",
    "11": "Noyabr",
    "12": "Dekabr"
  };
  return `${names[month] || month || ""} ${year || ""}`.trim();
}

function safePdfText(value, fallback = "-") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–|—/g, "-")
    .replace(/\s+/g, " ");
}

function truncateText(value, maxLength = 46) {
  const text = safePdfText(value, "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function getContentWorkTime(row = {}) {
  const direct = [row.publish_time, row.deadline_time, row.time]
    .map((value) => String(value || "").trim())
    .find((value) => /^\d{1,2}:\d{2}$/.test(value));
  if (direct) return direct.padStart(5, "0");
  const text = [row.approval_comment, row.notes, row.description].map((value) => String(value || "")).join(" / ");
  const labeled = text.match(/(?:vaqt|soat)\s*[:=-]?\s*(\d{1,2}:\d{2})/i);
  if (labeled) return labeled[1].padStart(5, "0");
  const loose = text.match(/\b(\d{1,2}:\d{2})\b/);
  return loose ? loose[1].padStart(5, "0") : "";
}

function getContentTone(row = {}) {
  const template = String(row.content_template || "").toLowerCase();
  const rubric = String(row.rubric || "").toLowerCase();
  if (template.includes("academy") || rubric.includes("academy") || rubric.includes("lifehack")) {
    return { fill: "#ecfdf3", stroke: "#22c55e", text: "#166534", tag: "Academy" };
  }
  if (template.includes("customer") || rubric.includes("customer") || rubric.includes("qahramon")) {
    return { fill: "#fffbeb", stroke: "#f59e0b", text: "#92400e", tag: "Mijoz" };
  }
  if (template.includes("services") || rubric.includes("xizmat")) {
    return { fill: "#eff6ff", stroke: "#0ea5e9", text: "#075985", tag: "Xizmat" };
  }
  const platform = String(row.platform || "").toLowerCase();
  if (platform.includes("telegram")) return { fill: "#eff6ff", stroke: "#38bdf8", text: "#0369a1", tag: "Telegram" };
  if (platform.includes("youtube")) return { fill: "#fff1f2", stroke: "#fb7185", text: "#9f1239", tag: "YouTube" };
  return { fill: "#f5f3ff", stroke: "#8b5cf6", text: "#5b21b6", tag: "Instagram" };
}

function buildCalendarCells(monthLabel, rows = []) {
  const [year, month] = String(monthLabel || "").split("-").map(Number);
  const firstDay = new Date(year, (month || 1) - 1, 1);
  const lastDate = new Date(year, month || 1, 0).getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const cells = [];
  const itemsByDate = new Map();

  rows.forEach((row) => {
    const date = formatDateOnly(row.publish_date);
    if (!date || date === "-" || !date.startsWith(String(monthLabel))) return;
    if (!itemsByDate.has(date)) itemsByDate.set(date, []);
    itemsByDate.get(date).push(row);
  });

  for (let i = 0; i < startWeekday; i += 1) cells.push({ empty: true, key: `empty-${i}` });
  for (let day = 1; day <= lastDate; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ empty: false, key: date, day, date, items: itemsByDate.get(date) || [] });
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true, key: `tail-${cells.length}` });
  return cells;
}

export function sendContentCalendarPdf(res, rows, monthLabel, fileName = "content-calendar.pdf") {
  const safeRows = Array.isArray(rows) ? rows : [];
  const doc = new PDFDocument({ margin: 22, size: "A4", layout: "landscape" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  doc.pipe(res);

  const pageLeft = doc.page.margins.left;
  const pageTop = doc.page.margins.top;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const title = `${getMonthTitle(monthLabel)} kontent reja`;

  doc
    .roundedRect(pageLeft, pageTop, pageWidth, 56, 14)
    .fillAndStroke("#0f172a", "#0f172a");
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#ffffff").text(title, pageLeft + 16, pageTop + 12, { width: pageWidth - 32 });
  doc.font("Helvetica").fontSize(9).fillColor("#cbd5e1").text(
    `alooSMM Manager OS / kalendar ko'rinishi / ${safeRows.length} ta kontent`,
    pageLeft + 16,
    pageTop + 36,
    { width: pageWidth - 32 }
  );

  const legend = [
    { label: "Lifehack / ACADEMY", color: "#22c55e" },
    { label: "Mijozlar", color: "#f59e0b" },
    { label: "Xizmatlarimiz", color: "#0ea5e9" },
    { label: "Boshqa kontent", color: "#8b5cf6" }
  ];
  let legendX = pageLeft + pageWidth - 360;
  legend.forEach((item) => {
    doc.circle(legendX, pageTop + 43, 4).fill(item.color);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#e2e8f0").text(item.label, legendX + 8, pageTop + 39, { width: 82 });
    legendX += 90;
  });

  const weekdays = ["Du", "Se", "Cho", "Pay", "Ju", "Sha", "Yak"];
  const calendarTop = pageTop + 72;
  const weekdayHeight = 22;
  const colWidth = pageWidth / 7;
  const cells = buildCalendarCells(monthLabel, safeRows);
  const rowCount = Math.max(5, Math.ceil(cells.length / 7));
  const cellHeight = (doc.page.height - doc.page.margins.bottom - calendarTop - weekdayHeight) / rowCount;

  weekdays.forEach((day, index) => {
    const x = pageLeft + index * colWidth;
    doc.rect(x, calendarTop, colWidth, weekdayHeight).fillAndStroke("#f1f5f9", "#dbe4f0");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#334155").text(day, x, calendarTop + 7, { width: colWidth, align: "center" });
  });

  cells.forEach((cell, index) => {
    const col = index % 7;
    const row = Math.floor(index / 7);
    const x = pageLeft + col * colWidth;
    const y = calendarTop + weekdayHeight + row * cellHeight;
    const isWeekend = col >= 5;

    doc
      .rect(x, y, colWidth, cellHeight)
      .fillAndStroke(cell.empty ? "#f8fafc" : isWeekend ? "#fff7ed" : "#ffffff", "#dbe4f0");

    if (cell.empty) return;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(String(cell.day), x + 6, y + 5, { width: 22 });

    const maxItems = cellHeight > 74 ? 3 : 2;
    cell.items.slice(0, maxItems).forEach((item, itemIndex) => {
      const tone = getContentTone(item);
      const cardX = x + 5;
      const cardY = y + 21 + itemIndex * 26;
      const cardW = colWidth - 10;
      const cardH = 21;
      doc.roundedRect(cardX, cardY, cardW, cardH, 4).fillAndStroke(tone.fill, tone.stroke);
      doc.font("Helvetica-Bold").fontSize(6.8).fillColor(tone.text).text(
        `${getContentWorkTime(item) || "--:--"} ${safePdfText(item.platform || tone.tag, "")}`,
        cardX + 4,
        cardY + 3,
        { width: cardW - 8, height: 7, ellipsis: true }
      );
      doc.font("Helvetica-Bold").fontSize(7.2).fillColor("#0f172a").text(
        truncateText(item.title, 34),
        cardX + 4,
        cardY + 11,
        { width: cardW - 8, height: 8, ellipsis: true }
      );
    });

    if (cell.items.length > maxItems) {
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#475569").text(
        `+${cell.items.length - maxItems} ta yana`,
        x + 6,
        y + cellHeight - 12,
        { width: colWidth - 12, align: "right" }
      );
    }
  });

  doc.end();
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
  const normalizedCurrency = String(currency || "UZS").toUpperCase();

  if (normalizedCurrency === "UZS") {
    return `${value.toLocaleString("uz-UZ")} UZS`;
  }

  if (normalizedCurrency === "USD") {
    return `$${value.toLocaleString("uz-UZ")}`;
  }

  try {
    return `${value.toLocaleString("uz-UZ")} ${normalizedCurrency}`.trim();
  } catch {
    return `${value} ${normalizedCurrency}`.trim();
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

function summarizeTravelAmounts(rows = [], mode = "expense") {
  const totals = new Map();

  rows.forEach((row) => {
    const currency = String(row.currency || "UZS").toUpperCase();
    const current = Number(totals.get(currency) || 0);
    const amount = Number(row.amount || 0);

    if (mode === "income" && row.entry_type === "kirim") {
      totals.set(currency, current + amount);
    } else if (mode === "expense" && row.entry_type !== "kirim") {
      totals.set(currency, current + amount);
    }
  });

  return totals;
}

function subtractCurrencyMaps(incomeMap, expenseMap) {
  const result = new Map();
  const currencies = new Set([...incomeMap.keys(), ...expenseMap.keys()]);
  currencies.forEach((currency) => {
    result.set(currency, Number(incomeMap.get(currency) || 0) - Number(expenseMap.get(currency) || 0));
  });
  return result;
}

function formatCurrencyMap(map) {
  const entries = [...map.entries()];
  if (!entries.length) return "0";
  return entries
    .map(([currency, amount]) => formatMoneyWithCurrency(amount, currency))
    .join(" | ");
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

  const expenseTotals = summarizeTravelAmounts(safeRows, "expense");
  const incomeTotals = summarizeTravelAmounts(safeRows, "income");
  const balanceTotals = subtractCurrencyMaps(incomeTotals, expenseTotals);

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#0f172a").text(title, { align: "center" });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10).fillColor("#64748b").text("Safar bo'yicha chiqim va kirimlar ro'yxati", { align: "center" });
  doc.moveDown(1);

  const summaryTop = doc.y;
  const summaryWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 20) / 3;
  [
    { label: "Umumiy chiqim", value: formatCurrencyMap(expenseTotals), tone: "#dc2626" },
    { label: "Umumiy kirim", value: formatCurrencyMap(incomeTotals), tone: "#16a34a" },
    { label: "Qoldiq", value: formatCurrencyMap(balanceTotals), tone: "#1d4ed8" }
  ].forEach((item, idx) => {
    const x = doc.page.margins.left + idx * (summaryWidth + 10);
    doc
      .lineWidth(1)
      .fillColor("#f8fafc")
      .strokeColor("#dbe4f0")
      .roundedRect(x, summaryTop, summaryWidth, 56, 10)
      .fillAndStroke();
    doc.fillColor("#64748b").fontSize(9).font("Helvetica-Bold").text(item.label, x + 10, summaryTop + 10, { width: summaryWidth - 20 });
    doc.fillColor(item.tone).fontSize(12).font("Helvetica-Bold").text(item.value, x + 10, summaryTop + 28, {
      width: summaryWidth - 20,
      ellipsis: true
    });
  });

  let cursorY = summaryTop + 78;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidths = [48, 80, 124, 222, 70, 66, tableWidth - (48 + 80 + 124 + 222 + 70 + 66)];
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
