import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', permissionRequired('calendar.view'), async (request, response, next) => {
  try {
    const now = new Date();
    const from = request.query.from ? new Date(request.query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = request.query.to ? new Date(request.query.to) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return response.status(400).json({ message: 'Kalendar sanasi noto‘g‘ri.' });
    }

    const params = [from.toISOString(), to.toISOString()];
    let extra = '';
    if (request.query.platformId) {
      params.push(Number(request.query.platformId));
      extra += ` AND c.platform_id = $${params.length}`;
    }
    if (request.query.branchId) {
      params.push(Number(request.query.branchId));
      extra += ` AND c.branch_id = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT c.id, c.title, c.content_type, c.status, c.publish_at, c.cover_url,
              p.id AS platform_id, p.code AS platform_code, p.name AS platform_name, p.color AS platform_color,
              b.id AS branch_id, b.name AS branch_name,
              u.full_name AS assignee_name
       FROM content_items c
       JOIN platforms p ON p.id = c.platform_id
       LEFT JOIN branches b ON b.id = c.branch_id
       LEFT JOIN app_users u ON u.id = c.assigned_to
       WHERE c.publish_at >= $1 AND c.publish_at < $2 ${extra}
       ORDER BY c.publish_at ASC`,
      params,
    );

    return response.json({
      from: from.toISOString(),
      to: to.toISOString(),
      items: rows.map((row) => ({
        id: Number(row.id),
        title: row.title,
        contentType: row.content_type,
        status: row.status,
        publishAt: row.publish_at,
        coverUrl: row.cover_url,
        platform: { id: Number(row.platform_id), code: row.platform_code, name: row.platform_name, color: row.platform_color },
        branch: row.branch_id ? { id: Number(row.branch_id), name: row.branch_name } : null,
        assigneeName: row.assignee_name,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
