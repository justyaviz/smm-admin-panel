import webpush from 'web-push';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

const enabled = Boolean(env.vapidPublicKey && env.vapidPrivateKey);

if (enabled) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
}

export function pushEnabled() {
  return enabled;
}

export async function sendPushToUsers(userIds, payload) {
  if (!enabled || !Array.isArray(userIds) || userIds.length === 0) return { sent: 0, removed: 0 };
  const ids = [...new Set(userIds.map(Number).filter(Number.isInteger))];
  if (!ids.length) return { sent: 0, removed: 0 };

  let rows = [];
  try {
    const result = await pool.query(
      `SELECT id,user_id,endpoint,p256dh,auth
       FROM push_subscriptions
       WHERE user_id=ANY($1::bigint[])`,
      [ids],
    );
    rows = result.rows;
  } catch (error) {
    console.warn('Push subscription jadvali tayyor emas:', error?.message || error);
    return { sent: 0, removed: 0 };
  }

  let sent = 0;
  let removed = 0;
  await Promise.all(rows.map(async (row) => {
    try {
      await webpush.sendNotification({
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      }, JSON.stringify(payload), { TTL: 60 * 60 });
      sent += 1;
      await pool.query('UPDATE push_subscriptions SET last_used_at=NOW(),updated_at=NOW() WHERE id=$1', [row.id]);
    } catch (error) {
      if ([404, 410].includes(Number(error?.statusCode))) {
        await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [row.id]);
        removed += 1;
        return;
      }
      console.warn('Push yuborilmadi:', error?.message || error);
    }
  }));

  return { sent, removed };
}
