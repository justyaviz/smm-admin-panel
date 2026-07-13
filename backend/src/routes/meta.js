import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', async (_request, response, next) => {
  try {
    const [platforms, branches, users, campaigns] = await Promise.all([
      pool.query('SELECT id, code, name, color FROM platforms WHERE is_active = TRUE ORDER BY sort_order, name'),
      pool.query('SELECT id, code, name, region FROM branches WHERE is_active = TRUE ORDER BY sort_order, name'),
      pool.query('SELECT id, full_name, role FROM app_users WHERE is_active = TRUE ORDER BY full_name'),
      pool.query("SELECT id,name,status FROM campaigns WHERE status NOT IN ('cancelled') ORDER BY created_at DESC,name"),
    ]);
    response.json({
      platforms: platforms.rows.map((row) => ({ ...row, id: Number(row.id) })),
      branches: branches.rows.map((row) => ({ ...row, id: Number(row.id) })),
      users: users.rows.map((row) => ({ id: Number(row.id), fullName: row.full_name, role: row.role })),
      campaigns: campaigns.rows.map((row) => ({ id: Number(row.id), name: row.name, status: row.status })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
