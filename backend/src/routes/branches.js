import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

const nullableText = z.union([z.string().trim(), z.null(), z.undefined()]).transform((value) => value || null);
const branchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(50).optional().or(z.literal('')),
  region: z.string().trim().max(100).default(''),
  address: z.string().trim().max(1000).default(''),
  phone: nullableText,
  managerName: z.string().trim().max(160).default(''),
  managerPhone: nullableText,
  monthlyContentTarget: z.coerce.number().int().min(0).max(10000).default(30),
  monthlyReachTarget: z.coerce.number().int().min(0).max(1000000000).default(100000),
  notes: z.string().trim().max(5000).default(''),
  isActive: z.boolean().default(true),
});

const accountSchema = z.object({
  platformId: z.coerce.number().int().positive(),
  accountName: z.string().trim().max(160).default(''),
  accountUrl: z.union([z.string().trim().url(), z.literal('')]).default(''),
  followers: z.coerce.number().int().min(0).max(1000000000).default(0),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(2000).default(''),
});

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ʻ’‘`']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || `branch-${Date.now()}`;
}

function mapBranch(row) {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    region: row.region || '',
    address: row.address || '',
    phone: row.phone || null,
    managerName: row.manager_name || '',
    managerPhone: row.manager_phone || null,
    monthlyContentTarget: Number(row.monthly_content_target || 0),
    monthlyReachTarget: Number(row.monthly_reach_target || 0),
    notes: row.notes || '',
    isActive: row.is_active,
    memberCount: Number(row.member_count || 0),
    socialAccountCount: Number(row.social_account_count || 0),
    monthlyContent: Number(row.monthly_content || 0),
    monthlyPublished: Number(row.monthly_published || 0),
    monthlyReach: Number(row.monthly_reach || 0),
    activeCampaigns: Number(row.active_campaigns || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const branchSelect = `
  SELECT b.*,
    (SELECT COUNT(*) FROM app_user_branches ub JOIN app_users u ON u.id=ub.user_id WHERE ub.branch_id=b.id AND u.is_active=TRUE) AS member_count,
    (SELECT COUNT(*) FROM branch_social_accounts sa WHERE sa.branch_id=b.id AND sa.is_active=TRUE) AS social_account_count,
    (SELECT COUNT(*) FROM content_items c WHERE c.branch_id=b.id AND c.created_at >= date_trunc('month', NOW())) AS monthly_content,
    (SELECT COUNT(*) FROM content_items c WHERE c.branch_id=b.id AND c.status='published' AND COALESCE(c.published_at,c.publish_at,c.created_at) >= date_trunc('month', NOW())) AS monthly_published,
    (SELECT COALESCE(SUM(a.reach),0) FROM analytics_daily_metrics a WHERE a.branch_id=b.id AND a.metric_date >= date_trunc('month', CURRENT_DATE)::date) AS monthly_reach,
    (SELECT COUNT(*) FROM campaign_branches cb JOIN campaigns c ON c.id=cb.campaign_id WHERE cb.branch_id=b.id AND c.status='active') AS active_campaigns
  FROM branches b
`;

router.get('/', permissionRequired('branches.view', 'branches.manage'), async (request, response, next) => {
  try {
    const conditions = [];
    const params = [];
    if (request.query.search) {
      params.push(`%${request.query.search}%`);
      conditions.push(`(b.name ILIKE $${params.length} OR b.region ILIKE $${params.length} OR b.code ILIKE $${params.length})`);
    }
    if (request.query.status === 'active') conditions.push('b.is_active=TRUE');
    if (request.query.status === 'inactive') conditions.push('b.is_active=FALSE');
    if (request.query.region) {
      params.push(request.query.region);
      conditions.push(`b.region=$${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`${branchSelect} ${where} ORDER BY b.is_active DESC, b.sort_order, b.name`, params);
    const summary = rows.reduce((acc, row) => {
      acc.total += 1;
      if (row.is_active) acc.active += 1;
      acc.members += Number(row.member_count || 0);
      acc.monthlyReach += Number(row.monthly_reach || 0);
      acc.monthlyContent += Number(row.monthly_content || 0);
      return acc;
    }, { total: 0, active: 0, members: 0, monthlyReach: 0, monthlyContent: 0 });
    const regions = [...new Set(rows.map((row) => row.region).filter(Boolean))].sort();
    response.json({ items: rows.map(mapBranch), summary, regions });
  } catch (error) { next(error); }
});

router.get('/:id', permissionRequired('branches.view', 'branches.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query(`${branchSelect} WHERE b.id=$1 LIMIT 1`, [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Filial topilmadi.' });
    const [accounts, members] = await Promise.all([
      pool.query(
        `SELECT sa.id, sa.platform_id, p.code AS platform_code, p.name AS platform_name, p.color,
                sa.account_name, sa.account_url, sa.followers, sa.is_active, sa.notes
         FROM branch_social_accounts sa JOIN platforms p ON p.id=sa.platform_id
         WHERE sa.branch_id=$1 ORDER BY p.sort_order,p.name`, [id],
      ),
      pool.query(
        `SELECT u.id,u.full_name,u.role,u.job_title,u.phone,ub.is_primary
         FROM app_user_branches ub JOIN app_users u ON u.id=ub.user_id
         WHERE ub.branch_id=$1 ORDER BY ub.is_primary DESC,u.full_name`, [id],
      ),
    ]);
    response.json({
      item: mapBranch(rows[0]),
      accounts: accounts.rows.map((row) => ({
        id: Number(row.id), platformId: Number(row.platform_id), platformCode: row.platform_code,
        platformName: row.platform_name, color: row.color, accountName: row.account_name,
        accountUrl: row.account_url, followers: Number(row.followers), isActive: row.is_active, notes: row.notes,
      })),
      members: members.rows.map((row) => ({ id: Number(row.id), fullName: row.full_name, role: row.role, jobTitle: row.job_title, phone: row.phone, isPrimary: row.is_primary })),
    });
  } catch (error) { next(error); }
});

router.post('/', permissionRequired('branches.manage'), async (request, response, next) => {
  try {
    const parsed = branchSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Filial ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    const baseCode = slugify(data.code || data.name);
    let code = baseCode;
    let suffix = 1;
    while ((await pool.query('SELECT 1 FROM branches WHERE code=$1', [code])).rowCount) {
      suffix += 1;
      code = `${baseCode.slice(0, 45)}-${suffix}`;
    }
    const { rows } = await pool.query(
      `INSERT INTO branches (code,name,region,address,phone,manager_name,manager_phone,monthly_content_target,monthly_reach_target,notes,is_active,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,(SELECT COALESCE(MAX(sort_order),0)+10 FROM branches))
       RETURNING id`,
      [code, data.name, data.region, data.address, data.phone, data.managerName, data.managerPhone, data.monthlyContentTarget, data.monthlyReachTarget, data.notes, data.isActive],
    );
    await pool.query(
      `INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'branch.create',$2,$3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ branchId: Number(rows[0].id), name: data.name })],
    );
    const result = await pool.query(`${branchSelect} WHERE b.id=$1`, [rows[0].id]);
    response.status(201).json({ item: mapBranch(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ message: 'Bunday kodli filial mavjud.' });
    next(error);
  }
});

router.put('/:id', permissionRequired('branches.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const parsed = branchSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Filial ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    const code = slugify(data.code || data.name);
    const result = await pool.query(
      `UPDATE branches SET code=$1,name=$2,region=$3,address=$4,phone=$5,manager_name=$6,manager_phone=$7,
              monthly_content_target=$8,monthly_reach_target=$9,notes=$10,is_active=$11
       WHERE id=$12 RETURNING id`,
      [code, data.name, data.region, data.address, data.phone, data.managerName, data.managerPhone, data.monthlyContentTarget, data.monthlyReachTarget, data.notes, data.isActive, id],
    );
    if (!result.rows[0]) return response.status(404).json({ message: 'Filial topilmadi.' });
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'branch.update',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ branchId: id, name: data.name })]);
    const updated = await pool.query(`${branchSelect} WHERE b.id=$1`, [id]);
    response.json({ item: mapBranch(updated.rows[0]) });
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ message: 'Bunday kodli filial mavjud.' });
    next(error);
  }
});

router.patch('/:id/status', permissionRequired('branches.manage'), async (request, response, next) => {
  try {
    const parsed = z.object({ isActive: z.boolean() }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Status qiymati noto‘g‘ri.' });
    const { rows } = await pool.query('UPDATE branches SET is_active=$1 WHERE id=$2 RETURNING id,name,is_active', [parsed.data.isActive, Number(request.params.id)]);
    if (!rows[0]) return response.status(404).json({ message: 'Filial topilmadi.' });
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'branch.status',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ branchId: Number(rows[0].id), isActive: rows[0].is_active })]);
    response.json({ ok: true, isActive: rows[0].is_active });
  } catch (error) { next(error); }
});

router.put('/:id/accounts/:platformId', permissionRequired('branches.manage'), async (request, response, next) => {
  try {
    const branchId = Number(request.params.id);
    const platformId = Number(request.params.platformId);
    const parsed = accountSchema.safeParse({ ...request.body, platformId });
    if (!parsed.success) return response.status(400).json({ message: 'Ijtimoiy tarmoq ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO branch_social_accounts(branch_id,platform_id,account_name,account_url,followers,is_active,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(branch_id,platform_id) DO UPDATE SET account_name=EXCLUDED.account_name,account_url=EXCLUDED.account_url,
         followers=EXCLUDED.followers,is_active=EXCLUDED.is_active,notes=EXCLUDED.notes
       RETURNING id`,
      [branchId, platformId, data.accountName, data.accountUrl, data.followers, data.isActive, data.notes],
    );
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'branch.account.update',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ branchId, platformId })]);
    response.json({ ok: true, id: Number(rows[0].id) });
  } catch (error) { next(error); }
});

router.delete('/:id', permissionRequired('branches.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('UPDATE branches SET is_active=FALSE WHERE id=$1 RETURNING id,name', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Filial topilmadi.' });
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'branch.archive',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ branchId: id, name: rows[0].name })]);
    response.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
