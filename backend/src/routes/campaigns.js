import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';

const router = Router();

const STATUSES = ['draft', 'planned', 'active', 'paused', 'completed', 'cancelled'];
const OBJECTIVES = ['awareness', 'traffic', 'engagement', 'messages', 'video_views', 'sales', 'promo'];

const nullableId = z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value === '' || value == null ? null : value));
const numberValue = z.union([z.coerce.number().min(0), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value === '' || value == null ? 0 : Number(value)));
const dateValue = z.union([z.string(), z.null(), z.undefined()])
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), 'Sana noto‘g‘ri.')
  .transform((value) => (value ? value.slice(0, 10) : null));

const campaignSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).default(''),
  objective: z.enum(OBJECTIVES),
  productDirection: z.string().trim().max(160).default(''),
  managerId: nullableId,
  status: z.enum(STATUSES).default('draft'),
  budget: numberValue,
  spend: numberValue,
  reach: numberValue,
  impressions: numberValue,
  clicks: numberValue,
  videoViews: numberValue,
  engagement: numberValue,
  messages: numberValue,
  salesCount: numberValue,
  salesValue: numberValue,
  startDate: dateValue,
  endDate: dateValue,
  platformIds: z.array(z.coerce.number().int().positive()).max(10).default([]),
  branchIds: z.array(z.coerce.number().int().positive()).max(100).default([]),
}).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: 'Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas.',
  path: ['endDate'],
});

function campaignSelect() {
  return `
    SELECT
      c.*,
      manager.full_name AS manager_name,
      creator.full_name AS creator_name,
      COALESCE((
        SELECT json_agg(json_build_object('id', p.id, 'code', p.code, 'name', p.name, 'color', p.color) ORDER BY p.sort_order)
        FROM campaign_platforms cp
        JOIN platforms p ON p.id = cp.platform_id
        WHERE cp.campaign_id = c.id
      ), '[]'::json) AS platforms,
      COALESCE((
        SELECT json_agg(json_build_object('id', b.id, 'code', b.code, 'name', b.name, 'region', b.region) ORDER BY b.sort_order)
        FROM campaign_branches cb
        JOIN branches b ON b.id = cb.branch_id
        WHERE cb.campaign_id = c.id
      ), '[]'::json) AS branches
    FROM campaigns c
    LEFT JOIN app_users manager ON manager.id = c.manager_id
    JOIN app_users creator ON creator.id = c.created_by
  `;
}

function mapCampaign(row) {
  const spend = Number(row.spend || 0);
  const salesValue = Number(row.sales_value || 0);
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    objective: row.objective,
    productDirection: row.product_direction,
    status: row.status,
    budget: Number(row.budget || 0),
    spend,
    reach: Number(row.reach || 0),
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    videoViews: Number(row.video_views || 0),
    engagement: Number(row.engagement || 0),
    messages: Number(row.messages || 0),
    salesCount: Number(row.sales_count || 0),
    salesValue,
    roi: spend > 0 ? Number((((salesValue - spend) / spend) * 100).toFixed(2)) : 0,
    startDate: row.start_date,
    endDate: row.end_date,
    manager: row.manager_id ? { id: Number(row.manager_id), fullName: row.manager_name } : null,
    creatorName: row.creator_name,
    platforms: row.platforms || [],
    branches: row.branches || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCampaign(id) {
  const { rows } = await pool.query(`${campaignSelect()} WHERE c.id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapCampaign(rows[0]) : null;
}

async function replaceRelations(client, campaignId, platformIds, branchIds) {
  await client.query('DELETE FROM campaign_platforms WHERE campaign_id = $1', [campaignId]);
  await client.query('DELETE FROM campaign_branches WHERE campaign_id = $1', [campaignId]);
  if (platformIds.length) {
    await client.query(
      `INSERT INTO campaign_platforms (campaign_id, platform_id)
       SELECT $1, UNNEST($2::bigint[]) ON CONFLICT DO NOTHING`,
      [campaignId, platformIds],
    );
  }
  if (branchIds.length) {
    await client.query(
      `INSERT INTO campaign_branches (campaign_id, branch_id)
       SELECT $1, UNNEST($2::bigint[]) ON CONFLICT DO NOTHING`,
      [campaignId, branchIds],
    );
  }
}

router.use(authRequired);

router.get('/summary', permissionRequired('campaigns.view'), async (_request, response, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'planned')::int AS planned,
        COALESCE(SUM(budget), 0)::numeric AS budget,
        COALESCE(SUM(spend), 0)::numeric AS spend,
        COALESCE(SUM(reach), 0)::bigint AS reach,
        COALESCE(SUM(clicks), 0)::bigint AS clicks,
        COALESCE(SUM(video_views), 0)::bigint AS video_views,
        COALESCE(SUM(engagement), 0)::bigint AS engagement,
        COALESCE(SUM(sales_value), 0)::numeric AS sales_value
      FROM campaigns
    `);
    const statusRows = await pool.query(`SELECT status, COUNT(*)::int AS count FROM campaigns GROUP BY status ORDER BY status`);
    response.json({
      metrics: {
        total: rows[0].total,
        active: rows[0].active,
        planned: rows[0].planned,
        budget: Number(rows[0].budget),
        spend: Number(rows[0].spend),
        reach: Number(rows[0].reach),
        clicks: Number(rows[0].clicks),
        videoViews: Number(rows[0].video_views),
        engagement: Number(rows[0].engagement),
        salesValue: Number(rows[0].sales_value),
        roi: Number(rows[0].spend) > 0 ? Number((((Number(rows[0].sales_value) - Number(rows[0].spend)) / Number(rows[0].spend)) * 100).toFixed(2)) : 0,
      },
      statusCounts: statusRows.rows,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', permissionRequired('campaigns.view'), async (request, response, next) => {
  try {
    const conditions = [];
    const params = [];
    const add = (sql, value) => { params.push(value); conditions.push(sql.replace('?', `$${params.length}`)); };

    if (request.query.search) {
      params.push(`%${request.query.search}%`);
      conditions.push(`(c.name ILIKE $${params.length} OR c.product_direction ILIKE $${params.length})`);
    }
    if (request.query.status) add('c.status = ?', request.query.status);
    if (request.query.objective) add('c.objective = ?', request.query.objective);
    if (request.query.platformId) {
      add('EXISTS (SELECT 1 FROM campaign_platforms cp WHERE cp.campaign_id = c.id AND cp.platform_id = ?)', Number(request.query.platformId));
    }
    if (request.query.branchId) {
      add('EXISTS (SELECT 1 FROM campaign_branches cb WHERE cb.campaign_id = c.id AND cb.branch_id = ?)', Number(request.query.branchId));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(Math.max(Number(request.query.limit) || 100, 1), 250);
    params.push(limit);
    const { rows } = await pool.query(
      `${campaignSelect()} ${where}
       ORDER BY CASE c.status WHEN 'active' THEN 1 WHEN 'planned' THEN 2 WHEN 'paused' THEN 3 ELSE 4 END,
                c.start_date DESC NULLS LAST, c.created_at DESC
       LIMIT $${params.length}`,
      params,
    );
    response.json({ items: rows.map(mapCampaign), total: rows.length });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', permissionRequired('campaigns.view'), async (request, response, next) => {
  try {
    const item = await getCampaign(Number(request.params.id));
    if (!item) return response.status(404).json({ message: 'Kampaniya topilmadi.' });
    return response.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.post('/', permissionRequired('campaigns.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const parsed = campaignSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Kampaniya ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO campaigns (
        name, description, objective, product_direction, manager_id, status,
        budget, spend, reach, impressions, clicks, video_views, engagement,
        messages, sales_count, sales_value, start_date, end_date, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING id`,
      [data.name, data.description, data.objective, data.productDirection, data.managerId, data.status,
        data.budget, data.spend, data.reach, data.impressions, data.clicks, data.videoViews, data.engagement,
        data.messages, data.salesCount, data.salesValue, data.startDate, data.endDate, request.user.id],
    );
    const id = rows[0].id;
    await replaceRelations(client, id, data.platformIds, data.branchIds);
    await client.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, 'campaign.create', $2, $3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ campaignId: Number(id), name: data.name })],
    );
    await client.query('COMMIT');
    return response.status(201).json({ item: await getCampaign(id) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return next(error);
  } finally {
    client.release();
  }
});

router.put('/:id', permissionRequired('campaigns.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const id = Number(request.params.id);
    const parsed = campaignSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Kampaniya ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE campaigns SET
        name=$1, description=$2, objective=$3, product_direction=$4, manager_id=$5, status=$6,
        budget=$7, spend=$8, reach=$9, impressions=$10, clicks=$11, video_views=$12,
        engagement=$13, messages=$14, sales_count=$15, sales_value=$16, start_date=$17, end_date=$18
       WHERE id=$19 RETURNING id`,
      [data.name, data.description, data.objective, data.productDirection, data.managerId, data.status,
        data.budget, data.spend, data.reach, data.impressions, data.clicks, data.videoViews,
        data.engagement, data.messages, data.salesCount, data.salesValue, data.startDate, data.endDate, id],
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return response.status(404).json({ message: 'Kampaniya topilmadi.' });
    }
    await replaceRelations(client, id, data.platformIds, data.branchIds);
    await client.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, 'campaign.update', $2, $3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ campaignId: id, name: data.name })],
    );
    await client.query('COMMIT');
    return response.json({ item: await getCampaign(id) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return next(error);
  } finally {
    client.release();
  }
});

router.delete('/:id', permissionRequired('campaigns.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('DELETE FROM campaigns WHERE id = $1 RETURNING id, name', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Kampaniya topilmadi.' });
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, 'campaign.delete', $2, $3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ campaignId: id, name: rows[0].name })],
    );
    return response.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
