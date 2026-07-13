import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { getAnalyticsOverview, normalizeAnalyticsFilters } from '../services/analytics.js';

const router = Router();
router.use(authRequired);

const nullableId = z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value === '' || value == null ? null : Number(value)));
const numberValue = z.union([z.coerce.number().min(0), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value === '' || value == null ? 0 : Number(value)));
const dateValue = z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), 'Sana noto‘g‘ri.');

const metricSchema = z.object({
  metricDate: dateValue,
  platformId: nullableId,
  branchId: nullableId,
  campaignId: nullableId,
  adId: nullableId,
  contentId: nullableId,
  reach: numberValue,
  impressions: numberValue,
  clicks: numberValue,
  engagement: numberValue,
  messages: numberValue,
  videoViews: numberValue,
  followersGained: numberValue,
  leads: numberValue,
  salesCount: numberValue,
  salesValue: numberValue,
  spend: numberValue,
  notes: z.string().trim().max(2000).default(''),
});

function mapEntry(row) {
  return {
    id: Number(row.id),
    metricDate: row.metric_date,
    platform: row.platform_id ? { id: Number(row.platform_id), name: row.platform_name, color: row.platform_color } : null,
    branch: row.branch_id ? { id: Number(row.branch_id), name: row.branch_name } : null,
    campaign: row.campaign_id ? { id: Number(row.campaign_id), name: row.campaign_name } : null,
    ad: row.ad_id ? { id: Number(row.ad_id), name: row.ad_name } : null,
    content: row.content_id ? { id: Number(row.content_id), title: row.content_title } : null,
    reach: Number(row.reach || 0), impressions: Number(row.impressions || 0), clicks: Number(row.clicks || 0),
    engagement: Number(row.engagement || 0), messages: Number(row.messages || 0), videoViews: Number(row.video_views || 0),
    followersGained: Number(row.followers_gained || 0), leads: Number(row.leads || 0), salesCount: Number(row.sales_count || 0),
    salesValue: Number(row.sales_value || 0), spend: Number(row.spend || 0), notes: row.notes,
    createdBy: row.creator_name, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

const entrySelect = `
  SELECT m.*, p.name AS platform_name, p.color AS platform_color,
    b.name AS branch_name, c.name AS campaign_name, t.name AS ad_name,
    ci.title AS content_title, u.full_name AS creator_name
  FROM analytics_daily_metrics m
  LEFT JOIN platforms p ON p.id = m.platform_id
  LEFT JOIN branches b ON b.id = m.branch_id
  LEFT JOIN campaigns c ON c.id = m.campaign_id
  LEFT JOIN target_ads t ON t.id = m.ad_id
  LEFT JOIN content_items ci ON ci.id = m.content_id
  JOIN app_users u ON u.id = m.created_by
`;

router.get('/overview', async (request, response, next) => {
  try {
    response.json(await getAnalyticsOverview(request.query));
  } catch (error) { next(error); }
});

router.get('/entries', async (request, response, next) => {
  try {
    const filters = normalizeAnalyticsFilters(request.query);
    const params = [filters.dateFrom, filters.dateTo];
    const conditions = ['m.metric_date BETWEEN $1 AND $2'];
    if (filters.platformId) { params.push(filters.platformId); conditions.push(`m.platform_id = $${params.length}`); }
    if (filters.branchId) { params.push(filters.branchId); conditions.push(`m.branch_id = $${params.length}`); }
    const limit = Math.min(Math.max(Number(request.query.limit) || 30, 1), 200);
    params.push(limit);
    const { rows } = await pool.query(`${entrySelect} WHERE ${conditions.join(' AND ')} ORDER BY m.metric_date DESC, m.id DESC LIMIT $${params.length}`, params);
    response.json({ items: rows.map(mapEntry) });
  } catch (error) { next(error); }
});

router.post('/entries', async (request, response, next) => {
  try {
    const parsed = metricSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Analitika ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const d = parsed.data;
    const { rows } = await pool.query(`
      INSERT INTO analytics_daily_metrics (
        metric_date, platform_id, branch_id, campaign_id, ad_id, content_id,
        reach, impressions, clicks, engagement, messages, video_views, followers_gained,
        leads, sales_count, sales_value, spend, notes, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING id
    `, [d.metricDate, d.platformId, d.branchId, d.campaignId, d.adId, d.contentId,
      d.reach, d.impressions, d.clicks, d.engagement, d.messages, d.videoViews, d.followersGained,
      d.leads, d.salesCount, d.salesValue, d.spend, d.notes, request.user.id]);
    await pool.query(`INSERT INTO audit_logs (user_id, action, ip_address, metadata) VALUES ($1,'analytics.create',$2,$3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ metricId: Number(rows[0].id), metricDate: d.metricDate })]);
    const item = await pool.query(`${entrySelect} WHERE m.id = $1`, [rows[0].id]);
    return response.status(201).json({ item: mapEntry(item.rows[0]) });
  } catch (error) { return next(error); }
});

router.put('/entries/:id', async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const parsed = metricSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Analitika ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const d = parsed.data;
    const { rows } = await pool.query(`
      UPDATE analytics_daily_metrics SET
        metric_date=$1, platform_id=$2, branch_id=$3, campaign_id=$4, ad_id=$5, content_id=$6,
        reach=$7, impressions=$8, clicks=$9, engagement=$10, messages=$11, video_views=$12,
        followers_gained=$13, leads=$14, sales_count=$15, sales_value=$16, spend=$17, notes=$18
      WHERE id=$19 RETURNING id
    `, [d.metricDate, d.platformId, d.branchId, d.campaignId, d.adId, d.contentId,
      d.reach, d.impressions, d.clicks, d.engagement, d.messages, d.videoViews, d.followersGained,
      d.leads, d.salesCount, d.salesValue, d.spend, d.notes, id]);
    if (!rows[0]) return response.status(404).json({ message: 'Analitika yozuvi topilmadi.' });
    await pool.query(`INSERT INTO audit_logs (user_id, action, ip_address, metadata) VALUES ($1,'analytics.update',$2,$3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ metricId: id })]);
    const item = await pool.query(`${entrySelect} WHERE m.id = $1`, [id]);
    return response.json({ item: mapEntry(item.rows[0]) });
  } catch (error) { return next(error); }
});

router.delete('/entries/:id', async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('DELETE FROM analytics_daily_metrics WHERE id=$1 RETURNING id', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Analitika yozuvi topilmadi.' });
    await pool.query(`INSERT INTO audit_logs (user_id, action, ip_address, metadata) VALUES ($1,'analytics.delete',$2,$3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ metricId: id })]);
    return response.json({ ok: true });
  } catch (error) { return next(error); }
});

export default router;
