import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

const ROLES = ['admin', 'smm_manager', 'targetolog', 'designer', 'mobilograf', 'copywriter', 'analyst', 'viewer'];
const nullableText = z.union([z.string().trim(), z.null(), z.undefined()]).transform((value) => value || null);
const nullableUrl = z.union([z.string().trim().url(), z.literal(''), z.null(), z.undefined()]).transform((value) => value || null);
const branchIdsSchema = z.array(z.coerce.number().int().positive()).max(50).default([]);

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  login: z.string().trim().min(2).max(80),
  phone: nullableText,
  email: z.union([z.string().trim().email(), z.literal(''), z.null(), z.undefined()]).transform((value) => value || null),
  password: z.string().min(6).max(200),
  role: z.enum(ROLES).default('viewer'),
  jobTitle: z.string().trim().max(160).default(''),
  avatarUrl: nullableUrl,
  telegramUsername: nullableText,
  notes: z.string().trim().max(5000).default(''),
  isActive: z.boolean().default(true),
  branchIds: branchIdsSchema,
  primaryBranchId: z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()]).transform((value) => value === '' || value == null ? null : value),
});

const updateSchema = createSchema.omit({ password: true }).extend({
  password: z.union([z.string().min(6).max(200), z.literal(''), z.null(), z.undefined()]).transform((value) => value || null),
});

function mapUser(row) {
  return {
    id: Number(row.id),
    fullName: row.full_name,
    login: row.login,
    phone: row.phone || null,
    email: row.email || null,
    role: row.role,
    roleName: row.role_name || row.role,
    roleColor: row.role_color || '#1690F5',
    jobTitle: row.job_title || '',
    avatarUrl: row.avatar_url || null,
    telegramUsername: row.telegram_username || null,
    notes: row.notes || '',
    isActive: row.is_active,
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at,
    branches: Array.isArray(row.branches) ? row.branches : [],
    permissionCount: Number(row.permission_count || 0),
  };
}

const userSelect = `
  SELECT u.id,u.full_name,u.login,u.phone,u.email,u.role,u.job_title,u.avatar_url,u.telegram_username,
         u.notes,u.is_active,u.last_login_at,u.created_at,
         r.name AS role_name,r.color AS role_color,
         COALESCE((SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_code=u.role),0) AS permission_count,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object('id',b.id,'code',b.code,'name',b.name,'isPrimary',ub.is_primary) ORDER BY ub.is_primary DESC,b.sort_order,b.name)
           FROM app_user_branches ub JOIN branches b ON b.id=ub.branch_id WHERE ub.user_id=u.id
         ),'[]'::jsonb) AS branches
  FROM app_users u
  LEFT JOIN roles r ON r.code=u.role
`;

async function assignBranches(client, userId, branchIds, primaryBranchId, assignedBy) {
  const unique = [...new Set(branchIds.map(Number))];
  const primary = primaryBranchId && unique.includes(Number(primaryBranchId)) ? Number(primaryBranchId) : unique[0] || null;
  await client.query('DELETE FROM app_user_branches WHERE user_id=$1', [userId]);
  for (const branchId of unique) {
    await client.query(
      `INSERT INTO app_user_branches(user_id,branch_id,is_primary,assigned_by) VALUES($1,$2,$3,$4)`,
      [userId, branchId, branchId === primary, assignedBy],
    );
  }
}

router.get('/', permissionRequired('team.view', 'team.manage'), async (request, response, next) => {
  try {
    const params = [];
    const conditions = [];
    if (request.query.search) {
      params.push(`%${request.query.search}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.login ILIKE $${params.length} OR COALESCE(u.phone,'') ILIKE $${params.length} OR COALESCE(u.email,'') ILIKE $${params.length})`);
    }
    if (request.query.role) {
      params.push(request.query.role);
      conditions.push(`u.role=$${params.length}`);
    }
    if (request.query.status === 'active') conditions.push('u.is_active=TRUE');
    if (request.query.status === 'inactive') conditions.push('u.is_active=FALSE');
    if (request.query.branchId) {
      params.push(Number(request.query.branchId));
      conditions.push(`EXISTS(SELECT 1 FROM app_user_branches f WHERE f.user_id=u.id AND f.branch_id=$${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`${userSelect} ${where} ORDER BY u.is_active DESC,u.full_name`, params);
    const summary = rows.reduce((acc, row) => {
      acc.total += 1;
      if (row.is_active) acc.active += 1; else acc.inactive += 1;
      if (row.last_login_at && new Date(row.last_login_at) >= new Date(Date.now() - 7 * 86400000)) acc.activeThisWeek += 1;
      return acc;
    }, { total: 0, active: 0, inactive: 0, activeThisWeek: 0 });
    response.json({ items: rows.map(mapUser), summary });
  } catch (error) { next(error); }
});

router.get('/:id', permissionRequired('team.view', 'team.manage'), async (request, response, next) => {
  try {
    const { rows } = await pool.query(`${userSelect} WHERE u.id=$1 LIMIT 1`, [Number(request.params.id)]);
    if (!rows[0]) return response.status(404).json({ message: 'Xodim topilmadi.' });
    response.json({ item: mapUser(rows[0]) });
  } catch (error) { next(error); }
});

router.post('/', permissionRequired('team.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Xodim ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    if (data.role === 'admin' && request.user.role !== 'admin') return response.status(403).json({ message: 'Administrator rolini faqat administrator bera oladi.' });
    const passwordHash = await bcrypt.hash(data.password, 12);
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO app_users(full_name,login,phone,email,password_hash,role,job_title,avatar_url,telegram_username,notes,is_active)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [data.fullName, data.login.toLowerCase(), data.phone, data.email?.toLowerCase() || null, passwordHash, data.role, data.jobTitle, data.avatarUrl, data.telegramUsername, data.notes, data.isActive],
    );
    const id = rows[0].id;
    await assignBranches(client, id, data.branchIds, data.primaryBranchId, request.user.id);
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'team.create',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ userId: Number(id), fullName: data.fullName, role: data.role })]);
    await client.query('COMMIT');
    const result = await pool.query(`${userSelect} WHERE u.id=$1`, [id]);
    response.status(201).json({ item: mapUser(result.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') return response.status(409).json({ message: 'Login, telefon yoki email avval ro‘yxatdan o‘tgan.' });
    next(error);
  } finally { client.release(); }
});

router.put('/:id', permissionRequired('team.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const id = Number(request.params.id);
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Xodim ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    if (data.role === 'admin' && request.user.role !== 'admin') return response.status(403).json({ message: 'Administrator rolini faqat administrator bera oladi.' });
    if (id === Number(request.user.id) && !data.isActive) return response.status(400).json({ message: 'O‘zingizni faol holatdan chiqara olmaysiz.' });
    await client.query('BEGIN');
    const current = await client.query('SELECT id,role FROM app_users WHERE id=$1 FOR UPDATE', [id]);
    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      return response.status(404).json({ message: 'Xodim topilmadi.' });
    }
    if (current.rows[0].role === 'admin' && request.user.role !== 'admin') {
      await client.query('ROLLBACK');
      return response.status(403).json({ message: 'Administratorni faqat administrator tahrirlay oladi.' });
    }
    let passwordHash = null;
    if (data.password) passwordHash = await bcrypt.hash(data.password, 12);
    await client.query(
      `UPDATE app_users SET full_name=$1,login=$2,phone=$3,email=$4,role=$5,job_title=$6,avatar_url=$7,
       telegram_username=$8,notes=$9,is_active=$10,password_hash=COALESCE($11,password_hash) WHERE id=$12`,
      [data.fullName, data.login.toLowerCase(), data.phone, data.email?.toLowerCase() || null, data.role, data.jobTitle, data.avatarUrl, data.telegramUsername, data.notes, data.isActive, passwordHash, id],
    );
    await assignBranches(client, id, data.branchIds, data.primaryBranchId, request.user.id);
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'team.update',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ userId: id, fullName: data.fullName, role: data.role, passwordChanged: Boolean(data.password) })]);
    await client.query('COMMIT');
    const result = await pool.query(`${userSelect} WHERE u.id=$1`, [id]);
    response.json({ item: mapUser(result.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') return response.status(409).json({ message: 'Login, telefon yoki email boshqa xodimga tegishli.' });
    next(error);
  } finally { client.release(); }
});

router.patch('/:id/status', permissionRequired('team.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const parsed = z.object({ isActive: z.boolean() }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Status noto‘g‘ri.' });
    if (id === Number(request.user.id) && !parsed.data.isActive) return response.status(400).json({ message: 'O‘zingizni bloklay olmaysiz.' });
    const current = await pool.query('SELECT role FROM app_users WHERE id=$1', [id]);
    if (!current.rows[0]) return response.status(404).json({ message: 'Xodim topilmadi.' });
    if (current.rows[0].role === 'admin' && request.user.role !== 'admin') return response.status(403).json({ message: 'Administrator holatini faqat administrator o‘zgartira oladi.' });
    const { rows } = await pool.query('UPDATE app_users SET is_active=$1 WHERE id=$2 RETURNING is_active', [parsed.data.isActive, id]);
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'team.status',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ userId: id, isActive: rows[0].is_active })]);
    response.json({ ok: true, isActive: rows[0].is_active });
  } catch (error) { next(error); }
});

router.post('/:id/reset-password', permissionRequired('team.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const parsed = z.object({ password: z.string().min(6).max(200) }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Yangi parol kamida 6 ta belgidan iborat bo‘lsin.' });
    const current = await pool.query('SELECT id,role FROM app_users WHERE id=$1', [id]);
    if (!current.rows[0]) return response.status(404).json({ message: 'Xodim topilmadi.' });
    if (current.rows[0].role === 'admin' && request.user.role !== 'admin') return response.status(403).json({ message: 'Administrator parolini faqat administrator o‘zgartira oladi.' });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [passwordHash, id]);
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'team.password.reset',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ userId: id })]);
    response.json({ ok: true });
  } catch (error) { next(error); }
});

router.delete('/:id', permissionRequired('team.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (id === Number(request.user.id)) return response.status(400).json({ message: 'O‘zingizni arxivlay olmaysiz.' });
    const current = await pool.query('SELECT id,role,full_name FROM app_users WHERE id=$1', [id]);
    if (!current.rows[0]) return response.status(404).json({ message: 'Xodim topilmadi.' });
    if (current.rows[0].role === 'admin' && request.user.role !== 'admin') return response.status(403).json({ message: 'Administratorni faqat administrator arxivlay oladi.' });
    await pool.query('UPDATE app_users SET is_active=FALSE WHERE id=$1', [id]);
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'team.archive',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ userId: id, fullName: current.rows[0].full_name })]);
    response.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
