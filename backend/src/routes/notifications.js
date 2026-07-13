import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { publishRealtime } from '../services/realtime.js';
import { pushEnabled, sendPushToUsers } from '../services/push.js';
import { env } from '../config/env.js';

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

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(3000),
  keys: z.object({
    p256dh: z.string().min(20).max(1000),
    auth: z.string().min(8).max(500),
  }),
});

router.get('/push/config', (_request, response) => {
  response.json({ enabled: pushEnabled(), publicKey: pushEnabled() ? env.vapidPublicKey : '' });
});

router.post('/push/subscribe', async (request, response, next) => {
  try {
    if (!pushEnabled()) return response.status(503).json({ message: 'Web Push serverda sozlanmagan.' });
    const parsed = pushSubscriptionSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Push subscription ma’lumotlari noto‘g‘ri.' });
    const subscription = parsed.data;
    await pool.query(
      `INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth,user_agent,last_used_at)
       VALUES($1,$2,$3,$4,$5,NOW())
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,
         user_agent=EXCLUDED.user_agent,last_used_at=NOW(),updated_at=NOW()`,
      [request.user.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, request.get('user-agent') || null],
    );
    response.status(201).json({ ok: true });
  } catch (error) { next(error); }
});

router.post('/push/unsubscribe', async (request, response, next) => {
  try {
    const endpoint = z.string().url().max(3000).safeParse(request.body?.endpoint);
    if (!endpoint.success) return response.status(400).json({ message: 'Push endpoint noto‘g‘ri.' });
    await pool.query('DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2', [request.user.id, endpoint.data]);
    response.json({ ok: true });
  } catch (error) { next(error); }
});

router.post('/push/test', async (request, response, next) => {
  try {
    if (!pushEnabled()) return response.status(503).json({ message: 'Web Push serverda sozlanmagan.' });
    const result = await sendPushToUsers([Number(request.user.id)], {
      title: 'aloo SMM Panel',
      body: 'Push bildirishnomalari muvaffaqiyatli ishlayapti.',
      icon: '/favicon-192.png',
      badge: '/favicon-32.png',
      url: '/dashboard',
      tag: 'aloo-push-test',
    });
    response.json({ ok: true, ...result });
  } catch (error) { next(error); }
});

router.post('/smart-check', async (request, response, next) => {
  try {
    const userId = Number(request.user.id);
    const inserted = [];
    const upcoming = await pool.query(`
      SELECT id,title,publish_at FROM content_items
      WHERE deleted_at IS NULL AND status IN ('approved','scheduled')
        AND publish_at BETWEEN NOW() AND NOW()+INTERVAL '2 hours'
        AND (assigned_to=$1 OR created_by=$1)
      ORDER BY publish_at LIMIT 20`, [userId]);
    for (const item of upcoming.rows) {
      const key = `smart-content-${item.id}-${new Date(item.publish_at).toISOString().slice(0,13)}`;
      const result = await pool.query(`INSERT INTO notifications(user_id,notification_type,title,message,link_page,link_entity_id,dedupe_key)
        VALUES($1,'content_due','Kontent nashriga 2 soatdan kam qoldi',$2,'content',$3,$4)
        ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING RETURNING id`,
        [userId,`${item.title} · ${new Date(item.publish_at).toLocaleString('uz-UZ')}`,Number(item.id),key]);
      if (result.rows[0]) inserted.push(Number(result.rows[0].id));
    }
    const overdue = await pool.query(`SELECT id,title,due_at FROM tasks WHERE status NOT IN ('done','cancelled') AND due_at<NOW() AND (assigned_to=$1 OR created_by=$1) ORDER BY due_at LIMIT 20`, [userId]).catch(() => ({ rows: [] }));
    for (const task of overdue.rows) {
      const key = `smart-task-overdue-${task.id}-${new Date(task.due_at).toISOString().slice(0,10)}`;
      const result = await pool.query(`INSERT INTO notifications(user_id,notification_type,title,message,link_page,link_entity_id,dedupe_key)
        VALUES($1,'task_overdue','Vazifa kechikdi',$2,'tasks',$3,$4)
        ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING RETURNING id`, [userId,task.title,Number(task.id),key]);
      if (result.rows[0]) inserted.push(Number(result.rows[0].id));
    }
    if (inserted.length) {
      publishRealtime('notifications.smart', { count: inserted.length }, [userId]);
      await sendPushToUsers([userId], {
        title: 'aloo SMM eslatmasi',
        body: `${inserted.length} ta muhim deadline yoki kechikkan vazifa bor.`,
        icon: '/favicon-192.png',
        badge: '/favicon-32.png',
        url: '/dashboard',
        tag: `smart-${userId}`,
      });
    }
    response.json({ ok:true,created:inserted.length });
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
