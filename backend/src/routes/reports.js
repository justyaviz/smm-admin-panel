import { Router } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';
import { getAnalyticsOverview, normalizeAnalyticsFilters } from '../services/analytics.js';

const router = Router();
router.use(authRequired);

const reportSchema = z.object({
  name: z.string().trim().min(2).max(180),
  reportType: z.enum(['full', 'summary', 'platforms', 'branches', 'campaigns', 'content']).default('full'),
  format: z.enum(['xlsx', 'pdf', 'csv']).default('xlsx'),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platformId: z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()]).transform((v) => (v === '' || v == null ? null : Number(v))),
  branchId: z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()]).transform((v) => (v === '' || v == null ? null : Number(v))),
}).refine((value) => value.dateTo >= value.dateFrom, { message: 'Hisobot tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas.', path: ['dateTo'] });

const reportLabels = {
  full: 'To‘liq SMM hisoboti', summary: 'Umumiy ko‘rsatkichlar', platforms: 'Platformalar tahlili',
  branches: 'Filiallar tahlili', campaigns: 'Kampaniyalar tahlili', content: 'Kontent hisoboti',
};

function mapReport(row) {
  return {
    id: Number(row.id), name: row.name, reportType: row.report_type, format: row.format,
    dateFrom: row.date_from, dateTo: row.date_to, filters: row.filters || {}, status: row.status,
    createdBy: row.creator_name, createdAt: row.created_at,
  };
}

function safeFilename(value) {
  return String(value || 'aloo-report').normalize('NFKD').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'aloo-report';
}

function n(value) { return Number(value || 0); }
function formatNumber(value) { return new Intl.NumberFormat('uz-UZ').format(n(value)); }
function formatMoney(value) { return `${new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n(value))} so'm`; }
function ascii(value) {
  return String(value ?? '')
    .replace(/[‘’ʼ`]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/o‘/gi, (m) => (m[0] === 'O' ? "O'" : "o'"))
    .replace(/g‘/gi, (m) => (m[0] === 'G' ? "G'" : "g'"));
}

function rowsForSummary(data) {
  const s = data.summary;
  return [
    ['Ko‘rsatkich', 'Qiymat'],
    ['Reach', formatNumber(s.reach)], ['Impressions', formatNumber(s.impressions)], ['Kliklar', formatNumber(s.clicks)],
    ['CTR', `${s.ctr}%`], ['Engagement', formatNumber(s.engagement)], ['Engagement rate', `${s.engagementRate}%`],
    ['Xabarlar', formatNumber(s.messages)], ['Leadlar', formatNumber(s.leads)], ['Sotuvlar', formatNumber(s.salesCount)],
    ['Sotuv qiymati', formatMoney(s.salesValue)], ['Sarf', formatMoney(s.spend)], ['ROAS', `${s.roas}x`],
    ['CPM', formatMoney(s.cpm)], ['CPC', formatMoney(s.cpc)], ['CPL', formatMoney(s.cpl)],
  ];
}

function csvEscape(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function sectionToCsv(title, rows) {
  return [`\n${csvEscape(title)}`, ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');
}

function buildCsv(data, report) {
  const parts = [
    'ALOO SMM PANEL HISOBOTI',
    `Hisobot,${csvEscape(report.name)}`,
    `Davr,${csvEscape(`${report.date_from} - ${report.date_to}`)}`,
    `Manba,${csvEscape(data.source)}`,
    sectionToCsv('UMUMIY KO‘RSATKICHLAR', rowsForSummary(data)),
  ];
  if (['full', 'platforms'].includes(report.report_type)) {
    parts.push(sectionToCsv('PLATFORMALAR', [['Platforma', 'Reach', 'Impressions', 'Klik', 'CTR %', 'Xabar', 'Lead', 'Sarf', 'ROAS'], ...data.platforms.map((x) => [x.name, x.reach, x.impressions, x.clicks, x.ctr, x.messages, x.leads, x.spend, x.roas])]));
  }
  if (['full', 'branches'].includes(report.report_type)) {
    parts.push(sectionToCsv('FILIALLAR', [['Filial', 'Hudud', 'Reach', 'Klik', 'Xabar', 'Lead', 'Sotuv', 'Sarf', 'ROAS'], ...data.branches.map((x) => [x.name, x.region || '', x.reach, x.clicks, x.messages, x.leads, x.salesCount, x.spend, x.roas])]));
  }
  if (['full', 'campaigns'].includes(report.report_type)) {
    parts.push(sectionToCsv('TOP KAMPANIYALAR', [['Kampaniya', 'Status', 'Maqsad', 'Reach', 'Klik', 'Sotuv qiymati', 'Sarf', 'ROAS'], ...data.topCampaigns.map((x) => [x.name, x.status, x.objective, x.reach, x.clicks, x.salesValue, x.spend, x.roas])]));
  }
  if (['full', 'content'].includes(report.report_type)) {
    parts.push(sectionToCsv('KONTENT', [['Platforma', 'Jami', 'Chop etilgan', 'Rejalashtirilgan'], ...data.contentPerformance.map((x) => [x.name, x.total, x.published, x.scheduled])]));
  }
  return Buffer.from(`\uFEFF${parts.join('\n')}`, 'utf8');
}

async function buildXlsx(data, report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'aloo SMM Panel';
  workbook.created = new Date();
  const blue = '1690F5';
  const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${blue}` } }, alignment: { vertical: 'middle' } };
  const addSheet = (name, columns, rows) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns.map(([header, key, width]) => ({ header, key, width }));
    sheet.getRow(1).eachCell((cell) => { Object.assign(cell, headerStyle); });
    rows.forEach((row) => sheet.addRow(row));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + columns.length)}1` };
    return sheet;
  };

  const summarySheet = workbook.addWorksheet('Umumiy');
  summarySheet.columns = [{ width: 28 }, { width: 24 }];
  summarySheet.addRow(['aloo SMM Panel', report.name]);
  summarySheet.addRow(['Davr', `${report.date_from} — ${report.date_to}`]);
  summarySheet.addRow(['Ma’lumot manbasi', data.source]);
  summarySheet.addRow([]);
  rowsForSummary(data).forEach((row) => summarySheet.addRow(row));
  summarySheet.getRow(1).font = { bold: true, size: 16, color: { argb: `FF${blue}` } };
  summarySheet.getRow(5).eachCell((cell) => { Object.assign(cell, headerStyle); });

  if (['full', 'platforms'].includes(report.report_type)) addSheet('Platformalar', [['Platforma','name',22],['Reach','reach',16],['Impressions','impressions',16],['Klik','clicks',14],['CTR %','ctr',12],['Xabar','messages',12],['Lead','leads',12],['Sarf','spend',18],['ROAS','roas',12]], data.platforms);
  if (['full', 'branches'].includes(report.report_type)) addSheet('Filiallar', [['Filial','name',22],['Hudud','region',24],['Reach','reach',16],['Klik','clicks',14],['Xabar','messages',12],['Lead','leads',12],['Sotuv','salesCount',12],['Sarf','spend',18],['ROAS','roas',12]], data.branches);
  if (['full', 'campaigns'].includes(report.report_type)) addSheet('Kampaniyalar', [['Kampaniya','name',30],['Status','status',15],['Maqsad','objective',16],['Reach','reach',16],['Klik','clicks',14],['Sotuv qiymati','salesValue',20],['Sarf','spend',18],['ROAS','roas',12]], data.topCampaigns);
  if (['full', 'content'].includes(report.report_type)) addSheet('Kontent', [['Platforma','name',22],['Jami','total',12],['Chop etilgan','published',16],['Rejalashtirilgan','scheduled',18]], data.contentPerformance);
  addSheet('Kunlik trend', [['Sana','date',16],['Reach','reach',16],['Impressions','impressions',16],['Klik','clicks',14],['Xabar','messages',12],['Lead','leads',12],['Sotuv','salesCount',12],['Sarf','spend',18]], data.trend);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function buildPdf(data, report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42, info: { Title: ascii(report.name), Author: 'aloo SMM Panel' } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const blue = '#1690F5';
    const line = (label, value) => { doc.font('Helvetica').fontSize(9).fillColor('#667085').text(ascii(label), { continued: true }); doc.font('Helvetica-Bold').fillColor('#101828').text(`  ${ascii(value)}`); };
    const table = (title, headers, rows, widths) => {
      if (doc.y > 690) doc.addPage();
      doc.moveDown(.8).font('Helvetica-Bold').fontSize(13).fillColor(blue).text(ascii(title));
      doc.moveDown(.4);
      const startX = doc.x; let y = doc.y;
      doc.rect(startX, y, widths.reduce((a,b) => a+b, 0), 22).fill(blue);
      let x = startX;
      headers.forEach((h, i) => { doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7).text(ascii(h), x + 4, y + 7, { width: widths[i] - 8, ellipsis: true }); x += widths[i]; });
      y += 22;
      rows.slice(0, 20).forEach((row, rowIndex) => {
        if (y > 760) { doc.addPage(); y = 42; }
        if (rowIndex % 2 === 0) doc.rect(startX, y, widths.reduce((a,b) => a+b, 0), 20).fill('#F8FAFC');
        x = startX;
        row.forEach((v, i) => { doc.fillColor('#344054').font('Helvetica').fontSize(7).text(ascii(v), x + 4, y + 6, { width: widths[i] - 8, ellipsis: true }); x += widths[i]; });
        y += 20;
      });
      doc.y = y;
    };

    doc.font('Helvetica-Bold').fontSize(22).fillColor(blue).text('aloo SMM Panel');
    doc.moveDown(.2).fontSize(16).fillColor('#101828').text(ascii(report.name));
    doc.moveDown(.3).font('Helvetica').fontSize(9).fillColor('#667085').text(`Davr: ${report.date_from} - ${report.date_to}`);
    doc.moveDown(1);
    rowsForSummary(data).slice(1).forEach(([label, value]) => line(label, value));

    if (['full','platforms'].includes(report.report_type)) table('Platformalar', ['Platforma','Reach','Klik','CTR','Sarf','ROAS'], data.platforms.map((x) => [x.name,formatNumber(x.reach),formatNumber(x.clicks),`${x.ctr}%`,formatMoney(x.spend),`${x.roas}x`]), [110,75,65,50,90,55]);
    if (['full','branches'].includes(report.report_type)) table('Filiallar', ['Filial','Reach','Klik','Lead','Sotuv','Sarf'], data.branches.map((x) => [x.name,formatNumber(x.reach),formatNumber(x.clicks),formatNumber(x.leads),formatNumber(x.salesCount),formatMoney(x.spend)]), [110,75,65,55,55,105]);
    if (['full','campaigns'].includes(report.report_type)) table('Kampaniyalar', ['Nomi','Status','Reach','Klik','Sarf','ROAS'], data.topCampaigns.map((x) => [x.name,x.status,formatNumber(x.reach),formatNumber(x.clicks),formatMoney(x.spend),`${x.roas}x`]), [155,65,70,55,90,50]);
    if (['full','content'].includes(report.report_type)) table('Kontent', ['Platforma','Jami','Chop etilgan','Rejalashtirilgan'], data.contentPerformance.map((x) => [x.name,x.total,x.published,x.scheduled]), [165,80,110,110]);
    doc.end();
  });
}

router.get('/summary', permissionRequired('reports.view'), async (_request, response, next) => {
  try {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS this_month, COUNT(*) FILTER (WHERE format='pdf')::int AS pdf, COUNT(*) FILTER (WHERE format='xlsx')::int AS xlsx FROM report_exports`);
    response.json({ metrics: rows[0] });
  } catch (error) { next(error); }
});

router.get('/', permissionRequired('reports.view'), async (request, response, next) => {
  try {
    const params = [];
    const conditions = [];
    if (request.query.format) { params.push(request.query.format); conditions.push(`r.format=$${params.length}`); }
    if (request.query.reportType) { params.push(request.query.reportType); conditions.push(`r.report_type=$${params.length}`); }
    const limit = Math.min(Math.max(Number(request.query.limit) || 100, 1), 250); params.push(limit);
    const { rows } = await pool.query(`SELECT r.*, u.full_name AS creator_name FROM report_exports r JOIN app_users u ON u.id=r.created_by ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY r.created_at DESC LIMIT $${params.length}`, params);
    response.json({ items: rows.map(mapReport) });
  } catch (error) { next(error); }
});

router.post('/', permissionRequired('reports.create'), async (request, response, next) => {
  try {
    const parsed = reportSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Hisobot ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const d = parsed.data;
    const filters = { platformId: d.platformId, branchId: d.branchId };
    const { rows } = await pool.query(`INSERT INTO report_exports (name, report_type, format, date_from, date_to, filters, created_by) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING id`, [d.name, d.reportType, d.format, d.dateFrom, d.dateTo, JSON.stringify(filters), request.user.id]);
    await pool.query(`INSERT INTO audit_logs (user_id, action, ip_address, metadata) VALUES ($1,'report.create',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ reportId: Number(rows[0].id), format: d.format })]);
    const item = await pool.query(`SELECT r.*, u.full_name AS creator_name FROM report_exports r JOIN app_users u ON u.id=r.created_by WHERE r.id=$1`, [rows[0].id]);
    return response.status(201).json({ item: mapReport(item.rows[0]), downloadUrl: `/api/reports/${rows[0].id}/download` });
  } catch (error) { return next(error); }
});

router.get('/:id/download', permissionRequired('reports.view'), async (request, response, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM report_exports WHERE id=$1', [Number(request.params.id)]);
    const report = rows[0];
    if (!report) return response.status(404).json({ message: 'Hisobot topilmadi.' });
    const filters = normalizeAnalyticsFilters({ dateFrom: report.date_from, dateTo: report.date_to, ...(report.filters || {}) });
    const data = await getAnalyticsOverview(filters);
    let buffer; let type; let extension;
    if (report.format === 'pdf') { buffer = await buildPdf(data, report); type = 'application/pdf'; extension = 'pdf'; }
    else if (report.format === 'csv') { buffer = buildCsv(data, report); type = 'text/csv; charset=utf-8'; extension = 'csv'; }
    else { buffer = await buildXlsx(data, report); type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; extension = 'xlsx'; }
    const filename = `${safeFilename(report.name)}-${report.date_from}-${report.date_to}.${extension}`;
    response.setHeader('Content-Type', type);
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.setHeader('Content-Length', buffer.length);
    return response.send(buffer);
  } catch (error) { return next(error); }
});

router.delete('/:id', permissionRequired('reports.create'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('DELETE FROM report_exports WHERE id=$1 RETURNING id,name', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Hisobot topilmadi.' });
    await pool.query(`INSERT INTO audit_logs (user_id, action, ip_address, metadata) VALUES ($1,'report.delete',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ reportId: id, name: rows[0].name })]);
    return response.json({ ok: true });
  } catch (error) { return next(error); }
});

export default router;
