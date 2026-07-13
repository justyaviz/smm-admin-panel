import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';

const router = Router();
const STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled'];
const OBJECTIVES = ['awareness', 'traffic', 'engagement', 'messages', 'video_views', 'sales'];

const nullableId = z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value === '' || value == null ? null : value));
const numberValue = z.union([z.coerce.number().min(0), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value === '' || value == null ? 0 : Number(value)));
const dateValue = z.union([z.string(), z.null(), z.undefined()])
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), 'Sana noto‘g‘ri.')
  .transform((value) => (value ? value.slice(0, 10) : null));

const adSchema = z.object({
  name: z.string().trim().min(2).max(180),
  campaignId: nullableId,
  platformId: z.coerce.number().int().positive(),
  branchId: nullableId,
  objective: z.enum(OBJECTIVES),
  audience: z.string().trim().max(500).default(''),
  placement: z.string().trim().max(180).default('Automatic placements'),
  externalId: z.string().trim().max(120).default(''),
  status: z.enum(STATUSES).default('draft'),
  dailyBudget: numberValue,
  totalBudget: numberValue,
  spend: numberValue,
  impressions: numberValue,
  reach: numberValue,
  clicks: numberValue,
  messages: numberValue,
  salesCount: numberValue,
  startDate: dateValue,
  endDate: dateValue,
}).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: 'Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas.',
  path: ['endDate'],
});

function adSelect() {
  return `
    SELECT
      a.*,
      p.code AS platform_code,
      p.name AS platform_name,
      p.color AS platform_color,
      b.name AS branch_name,
      c.name AS campaign_name,
      creator.full_name AS creator_name
    FROM target_ads a
    JOIN platforms p ON p.id = a.platform_id
    LEFT JOIN branches b ON b.id = a.branch_id
    LEFT JOIN campaigns c ON c.id = a.campaign_id
    JOIN app_users creator ON creator.id = a.created_by
  `;
}

function mapAd(row) {
  const impressions = Number(row.impressions || 0);
  const clicks = Number(row.clicks || 0);
  const spend = Number(row.spend || 0);
  return {
    id: Number(row.id),
    name: row.name,
    objective: row.objective,
    audience: row.audience,
    placement: row.placement,
    externalId: row.external_id,
    status: row.status,
    dailyBudget: Number(row.daily_budget || 0),
    totalBudget: Number(row.total_budget || 0),
    spend,
    impressions,
    reach: Number(row.reach || 0),
    clicks,
    messages: Number(row.messages || 0),
    salesCount: Number(row.sales_count || 0),
    cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0,
    ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    startDate: row.start_date,
    endDate: row.end_date,
    campaign: row.campaign_id ? { id: Number(row.campaign_id), name: row.campaign_name } : null,
    platform: { id: Number(row.platform_id), code: row.platform_code, name: row.platform_name, color: row.platform_color },
    branch: row.branch_id ? { id: Number(row.branch_id), name: row.branch_name } : null,
    creatorName: row.creator_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAd(id) {
  const { rows } = await pool.query(`${adSelect()} WHERE a.id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapAd(rows[0]) : null;
}

router.use(authRequired);

router.get('/summary', permissionRequired('ads.view'), async (_request, response, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COALESCE(SUM(daily_budget), 0)::numeric AS daily_budget,
        COALESCE(SUM(total_budget), 0)::numeric AS total_budget,
        COALESCE(SUM(spend), 0)::numeric AS spend,
        COALESCE(SUM(impressions), 0)::bigint AS impressions,
        COALESCE(SUM(reach), 0)::bigint AS reach,
        COALESCE(SUM(clicks), 0)::bigint AS clicks,
        COALESCE(SUM(messages), 0)::bigint AS messages,
        COALESCE(SUM(sales_count), 0)::bigint AS sales_count
      FROM target_ads
    `);
    const platformRows = await pool.query(`
      SELECT p.id, p.name, p.color, COUNT(a.id)::int AS ads,
             COALESCE(SUM(a.spend),0)::numeric AS spend,
             COALESCE(SUM(a.clicks),0)::bigint AS clicks
      FROM platforms p
      LEFT JOIN target_ads a ON a.platform_id = p.id
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.name, p.color, p.sort_order
      ORDER BY p.sort_order
    `);
    const m = rows[0];
    response.json({
      metrics: {
        total: m.total,
        active: m.active,
        dailyBudget: Number(m.daily_budget),
        totalBudget: Number(m.total_budget),
        spend: Number(m.spend),
        impressions: Number(m.impressions),
        reach: Number(m.reach),
        clicks: Number(m.clicks),
        messages: Number(m.messages),
        salesCount: Number(m.sales_count),
        cpm: Number(m.impressions) > 0 ? Number(((Number(m.spend) / Number(m.impressions)) * 1000).toFixed(2)) : 0,
        ctr: Number(m.impressions) > 0 ? Number(((Number(m.clicks) / Number(m.impressions)) * 100).toFixed(2)) : 0,
      },
      platformStats: platformRows.rows.map((row) => ({ ...row, id: Number(row.id), ads: Number(row.ads), spend: Number(row.spend), clicks: Number(row.clicks) })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', permissionRequired('ads.view'), async (request, response, next) => {
  try {
    const conditions = [];
    const params = [];
    const add = (sql, value) => { params.push(value); conditions.push(sql.replace('?', `$${params.length}`)); };
    if (request.query.search) {
      params.push(`%${request.query.search}%`);
      conditions.push(`(a.name ILIKE $${params.length} OR a.audience ILIKE $${params.length})`);
    }
    if (request.query.status) add('a.status = ?', request.query.status);
    if (request.query.platformId) add('a.platform_id = ?', Number(request.query.platformId));
    if (request.query.branchId) add('a.branch_id = ?', Number(request.query.branchId));
    if (request.query.campaignId) add('a.campaign_id = ?', Number(request.query.campaignId));
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(Math.max(Number(request.query.limit) || 100, 1), 250);
    params.push(limit);
    const { rows } = await pool.query(
      `${adSelect()} ${where}
       ORDER BY CASE a.status WHEN 'active' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
                a.start_date DESC NULLS LAST, a.created_at DESC
       LIMIT $${params.length}`,
      params,
    );
    response.json({ items: rows.map(mapAd), total: rows.length });
  } catch (error) {
    next(error);
  }
});

router.post('/', permissionRequired('ads.manage'), async (request, response, next) => {
  try {
    const parsed = adSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Reklama ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const d = parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO target_ads (
        name, campaign_id, platform_id, branch_id, objective, audience, placement, external_id,
        status, daily_budget, total_budget, spend, impressions, reach, clicks, messages,
        sales_count, start_date, end_date, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      [d.name, d.campaignId, d.platformId, d.branchId, d.objective, d.audience, d.placement, d.externalId,
        d.status, d.dailyBudget, d.totalBudget, d.spend, d.impressions, d.reach, d.clicks, d.messages,
        d.salesCount, d.startDate, d.endDate, request.user.id],
    );
    const id = rows[0].id;
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, 'ad.create', $2, $3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ adId: Number(id), name: d.name })],
    );
    return response.status(201).json({ item: await getAd(id) });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', permissionRequired('ads.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const parsed = adSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Reklama ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const d = parsed.data;
    const { rows } = await pool.query(
      `UPDATE target_ads SET
        name=$1, campaign_id=$2, platform_id=$3, branch_id=$4, objective=$5,
        audience=$6, placement=$7, external_id=$8, status=$9, daily_budget=$10,
        total_budget=$11, spend=$12, impressions=$13, reach=$14, clicks=$15,
        messages=$16, sales_count=$17, start_date=$18, end_date=$19
       WHERE id=$20 RETURNING id`,
      [d.name, d.campaignId, d.platformId, d.branchId, d.objective, d.audience, d.placement, d.externalId,
        d.status, d.dailyBudget, d.totalBudget, d.spend, d.impressions, d.reach, d.clicks,
        d.messages, d.salesCount, d.startDate, d.endDate, id],
    );
    if (!rows[0]) return response.status(404).json({ message: 'Reklama topilmadi.' });
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, 'ad.update', $2, $3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ adId: id, name: d.name })],
    );
    return response.json({ item: await getAd(id) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', permissionRequired('ads.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('DELETE FROM target_ads WHERE id = $1 RETURNING id, name', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Reklama topilmadi.' });
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, 'ad.delete', $2, $3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ adId: id, name: rows[0].name })],
    );
    return response.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
