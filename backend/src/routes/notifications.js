import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function mapNotification(row) {
  return {
    id: Number(row.id), type: row.notification_type, title: row.title, message: row.message,
    linkPage: row.link_page || null, linkEntityId: row.link_entity_id ? Number(row.link_entity_id) : null,
    metadata: row.metadata || {}, isRead: row.is_read, readAt: row.read_at || null, createdAt: row.created_at,
  };
}

router.get('/', async (request, response, next) => {
  try {
    const limit = Math.min(Math.max(Number(request.query.limit) || 30, 1), 100);
    const unreadOnly = request.query.unreadOnly === 'true';
    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id=$1 ${unreadOnly ? 'AND is_read=FALSE' : ''}
       ORDER BY created_at DESC LIMIT $2`,
      [request.user.id, limit],
    );
    const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND is_read=FALSE', [request.user.id]);
    response.json({ items: rows.map(mapNotification), unreadCount: Number(countResult.rows[0].count || 0) });
  } catch (error) { next(error); }
});

router.get('/count', async (request, response, next) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND is_read=FALSE', [request.user.id]);
    response.json({ unreadCount: Number(rows[0].count || 0) });
  } catch (error) { next(error); }
});

router.patch('/:id/read', async (request, response, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications SET is_read=TRUE,read_at=COALESCE(read_at,NOW())
       WHERE id=$1 AND user_id=$2 RETURNING id`,
      [Number(request.params.id), request.user.id],
    );
    if (!rows[0]) return response.status(404).json({ message: 'Bildirishnoma topilmadi.' });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

router.post('/read-all', async (request, response, next) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read=TRUE,read_at=COALESCE(read_at,NOW())
       WHERE user_id=$1 AND is_read=FALSE`,
      [request.user.id],
    );
    response.json({ ok: true, updated: result.rowCount });
  } catch (error) { next(error); }
});

router.delete('/:id', async (request, response, next) => {
  try {
    const result = await pool.query('DELETE FROM notifications WHERE id=$1 AND user_id=$2', [Number(request.params.id), request.user.id]);
    if (!result.rowCount) return response.status(404).json({ message: 'Bildirishnoma topilmadi.' });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
