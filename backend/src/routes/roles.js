import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', permissionRequired('team.view', 'team.manage', 'roles.manage'), async (_request, response, next) => {
  try {
    const [roles, permissions] = await Promise.all([
      pool.query(
        `SELECT r.code,r.name,r.description,r.color,r.is_system,r.sort_order,
                COUNT(DISTINCT u.id)::int AS user_count,
                COALESCE(jsonb_agg(DISTINCT rp.permission_code) FILTER (WHERE rp.permission_code IS NOT NULL),'[]'::jsonb) AS permissions
         FROM roles r
         LEFT JOIN app_users u ON u.role=r.code
         LEFT JOIN role_permissions rp ON rp.role_code=r.code
         GROUP BY r.code,r.name,r.description,r.color,r.is_system,r.sort_order
         ORDER BY r.sort_order,r.name`,
      ),
      pool.query('SELECT code,name,description,permission_group,sort_order FROM permissions ORDER BY permission_group,sort_order,name'),
    ]);
    response.json({
      roles: roles.rows.map((row) => ({
        code: row.code,
        name: row.name,
        description: row.description,
        color: row.color,
        isSystem: row.is_system,
        userCount: Number(row.user_count || 0),
        permissions: row.permissions || [],
      })),
      permissions: permissions.rows.map((row) => ({
        code: row.code,
        name: row.name,
        description: row.description,
        group: row.permission_group,
      })),
    });
  } catch (error) { next(error); }
});

router.put('/:code/permissions', permissionRequired('roles.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const code = request.params.code;
    if (code === 'admin') return response.status(400).json({ message: 'Administrator barcha ruxsatlarga doim ega.' });
    const parsed = z.object({ permissions: z.array(z.string().min(2).max(80)).max(100) }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Ruxsatlar ro‘yxati noto‘g‘ri.' });
    const role = await client.query('SELECT code FROM roles WHERE code=$1', [code]);
    if (!role.rows[0]) return response.status(404).json({ message: 'Rol topilmadi.' });
    const unique = [...new Set(parsed.data.permissions)];
    await client.query('BEGIN');
    await client.query('DELETE FROM role_permissions WHERE role_code=$1', [code]);
    if (unique.length) {
      const valid = await client.query('SELECT code FROM permissions WHERE code = ANY($1::text[])', [unique]);
      for (const row of valid.rows) {
        await client.query('INSERT INTO role_permissions(role_code,permission_code) VALUES($1,$2)', [code, row.code]);
      }
    }
    await client.query(
      `INSERT INTO audit_logs(user_id,action,ip_address,metadata)
       VALUES($1,'role.permissions.update',$2,$3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ role: code, permissions: unique })],
    );
    await client.query('COMMIT');
    response.json({ ok: true, permissions: unique });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

export default router;
