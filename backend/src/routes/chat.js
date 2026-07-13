import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';
import { publishRealtime } from '../services/realtime.js';
import { sendPushToUsers } from '../services/push.js';

const router = Router();
router.use(authRequired, permissionRequired('chat.use'));

const messageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  replyToId: z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()])
    .transform((value) => value === '' || value == null ? null : Number(value)),
});

const groupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).default(''),
  memberIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default('#1690F5'),
});

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

async function ensureGeneralMembership(userId) {
  const channelResult = await pool.query(
    `INSERT INTO chat_channels(name,slug,channel_type,description,color,created_by)
     VALUES('Umumiy chat','general','general','Barcha aloo SMM jamoasi uchun umumiy chat','#1690F5',$1)
     ON CONFLICT(slug) DO UPDATE SET is_archived=FALSE
     RETURNING id`,
    [userId],
  );
  const channelId = channelResult.rows[0].id;
  await pool.query(
    `INSERT INTO chat_channel_members(channel_id,user_id,member_role,last_read_at)
     VALUES($1,$2,'member',NOW()) ON CONFLICT(channel_id,user_id) DO NOTHING`,
    [channelId, userId],
  );
  return Number(channelId);
}

async function assertAccess(channelId, userId) {
  const { rows } = await pool.query(
    `SELECT c.id,c.channel_type,c.name,c.is_archived
     FROM chat_channels c
     WHERE c.id=$1 AND c.is_archived=FALSE
       AND (c.channel_type='general' OR EXISTS(
         SELECT 1 FROM chat_channel_members cm WHERE cm.channel_id=c.id AND cm.user_id=$2
       ))
     LIMIT 1`,
    [channelId, userId],
  );
  return rows[0] || null;
}

function mapMessage(row) {
  return {
    id: Number(row.id),
    channelId: Number(row.channel_id),
    body: row.is_deleted ? '' : row.body,
    senderId: Number(row.sender_id),
    senderName: row.sender_name,
    senderAvatarUrl: row.sender_avatar_url || null,
    senderInitials: initials(row.sender_name),
    replyTo: row.reply_to_id ? {
      id: Number(row.reply_to_id),
      body: row.reply_body || '',
      senderName: row.reply_sender_name || '',
    } : null,
    isEdited: row.is_edited,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/members', async (_request, response, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,full_name,job_title,avatar_url,role,last_login_at
       FROM app_users WHERE is_active=TRUE ORDER BY full_name`,
    );
    response.json({ items: rows.map((row) => ({
      id: Number(row.id), fullName: row.full_name, jobTitle: row.job_title || '',
      avatarUrl: row.avatar_url || null, role: row.role, lastLoginAt: row.last_login_at || null,
    })) });
  } catch (error) { next(error); }
});

router.get('/channels', async (request, response, next) => {
  try {
    await ensureGeneralMembership(request.user.id);
    const search = String(request.query.search || '').trim();
    const params = [request.user.id];
    let searchSql = '';
    if (search) {
      params.push(`%${search}%`);
      searchSql = `AND (c.name ILIKE $2 OR c.description ILIKE $2 OR EXISTS(
        SELECT 1 FROM chat_channel_members scm JOIN app_users su ON su.id=scm.user_id
        WHERE scm.channel_id=c.id AND su.full_name ILIKE $2
      ))`;
    }
    const { rows } = await pool.query(
      `SELECT c.id,c.name,c.slug,c.channel_type,c.description,c.color,c.last_message_at,c.created_at,
              cm.muted,cm.last_read_at,
              COALESCE(members.items,'[]'::jsonb) AS members,
              lm.id AS last_message_id,lm.body AS last_message_body,lm.created_at AS last_message_created_at,
              lm.sender_id AS last_message_sender_id,lm.sender_name AS last_message_sender_name,
              COALESCE(unread.count,0)::int AS unread_count
       FROM chat_channels c
       LEFT JOIN chat_channel_members cm ON cm.channel_id=c.id AND cm.user_id=$1
       LEFT JOIN LATERAL (
         SELECT jsonb_agg(jsonb_build_object(
           'id',u.id,'fullName',u.full_name,'avatarUrl',u.avatar_url,'jobTitle',u.job_title,'role',u.role
         ) ORDER BY u.full_name) AS items
         FROM chat_channel_members allm JOIN app_users u ON u.id=allm.user_id
         WHERE allm.channel_id=c.id AND u.is_active=TRUE
       ) members ON TRUE
       LEFT JOIN LATERAL (
         SELECT m.id,m.body,m.created_at,m.sender_id,u.full_name AS sender_name
         FROM chat_messages m JOIN app_users u ON u.id=m.sender_id
         WHERE m.channel_id=c.id AND m.is_deleted=FALSE
         ORDER BY m.id DESC LIMIT 1
       ) lm ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS count FROM chat_messages m
         WHERE m.channel_id=c.id AND m.sender_id<>$1 AND m.is_deleted=FALSE
           AND m.created_at>COALESCE(cm.last_read_at,'1970-01-01'::timestamptz)
       ) unread ON TRUE
       WHERE c.is_archived=FALSE
         AND (c.channel_type='general' OR cm.user_id IS NOT NULL)
         ${searchSql}
       ORDER BY COALESCE(c.last_message_at,c.created_at) DESC,c.id`,
      params,
    );
    response.json({ items: rows.map((row) => ({
      id: Number(row.id), name: row.name, slug: row.slug, channelType: row.channel_type,
      description: row.description || '', color: row.color || '#1690F5', muted: Boolean(row.muted),
      unreadCount: Number(row.unread_count || 0), lastReadAt: row.last_read_at || null,
      lastMessageAt: row.last_message_at || null, createdAt: row.created_at,
      members: Array.isArray(row.members) ? row.members.map((member) => ({ ...member, id: Number(member.id) })) : [],
      lastMessage: row.last_message_id ? {
        id: Number(row.last_message_id), body: row.last_message_body,
        createdAt: row.last_message_created_at, senderId: Number(row.last_message_sender_id),
        senderName: row.last_message_sender_name,
      } : null,
    })) });
  } catch (error) { next(error); }
});

router.post('/channels', async (request, response, next) => {
  const client = await pool.connect();
  try {
    const parsed = groupSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Guruh ma’lumotlarini tekshiring.' });
    const data = parsed.data;
    const memberIds = [...new Set([request.user.id, ...data.memberIds.map(Number)])];
    await client.query('BEGIN');
    const valid = await client.query('SELECT id FROM app_users WHERE id=ANY($1::bigint[]) AND is_active=TRUE', [memberIds]);
    if (valid.rows.length !== memberIds.length) {
      await client.query('ROLLBACK');
      return response.status(400).json({ message: 'A’zolardan biri topilmadi yoki faol emas.' });
    }
    const { rows } = await client.query(
      `INSERT INTO chat_channels(name,channel_type,description,color,created_by)
       VALUES($1,'group',$2,$3,$4) RETURNING id`,
      [data.name, data.description, data.color, request.user.id],
    );
    const channelId = rows[0].id;
    for (const userId of memberIds) {
      await client.query(
        `INSERT INTO chat_channel_members(channel_id,user_id,member_role,last_read_at)
         VALUES($1,$2,$3,NOW())`,
        [channelId, userId, Number(userId) === Number(request.user.id) ? 'owner' : 'member'],
      );
    }
    await client.query(
      `INSERT INTO audit_logs(user_id,action,ip_address,metadata)
       VALUES($1,'chat.channel.create',$2,$3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ channelId: Number(channelId), name: data.name, memberCount: memberIds.length })],
    );
    await client.query('COMMIT');
    response.status(201).json({ id: Number(channelId) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

router.post('/direct/:userId', async (request, response, next) => {
  const client = await pool.connect();
  try {
    const otherId = Number(request.params.userId);
    if (!Number.isInteger(otherId) || otherId <= 0 || otherId === Number(request.user.id)) {
      return response.status(400).json({ message: 'Suhbat uchun boshqa xodimni tanlang.' });
    }
    const pair = [Number(request.user.id), otherId].sort((a, b) => a - b);
    const directKey = `${pair[0]}:${pair[1]}`;
    await client.query('BEGIN');
    const userResult = await client.query('SELECT id,full_name FROM app_users WHERE id=$1 AND is_active=TRUE', [otherId]);
    if (!userResult.rows[0]) {
      await client.query('ROLLBACK');
      return response.status(404).json({ message: 'Xodim topilmadi.' });
    }
    const { rows } = await client.query(
      `INSERT INTO chat_channels(name,channel_type,direct_key,color,created_by)
       VALUES('Shaxsiy suhbat','direct',$1,'#1690F5',$2)
       ON CONFLICT(direct_key) DO UPDATE SET is_archived=FALSE
       RETURNING id`,
      [directKey, request.user.id],
    );
    const channelId = rows[0].id;
    for (const userId of pair) {
      await client.query(
        `INSERT INTO chat_channel_members(channel_id,user_id,member_role,last_read_at)
         VALUES($1,$2,'member',NOW()) ON CONFLICT(channel_id,user_id) DO NOTHING`,
        [channelId, userId],
      );
    }
    await client.query('COMMIT');
    response.json({ id: Number(channelId) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

router.get('/channels/:id/messages', async (request, response, next) => {
  try {
    const channelId = Number(request.params.id);
    if (!(await assertAccess(channelId, request.user.id))) return response.status(404).json({ message: 'Chat topilmadi.' });
    const limit = Math.min(Math.max(Number(request.query.limit) || 60, 1), 100);
    const before = request.query.before ? Number(request.query.before) : null;
    const params = [channelId, limit];
    const beforeSql = before ? 'AND m.id<$3' : '';
    if (before) params.push(before);
    const { rows } = await pool.query(
      `SELECT m.id,m.channel_id,m.sender_id,m.body,m.reply_to_id,m.is_edited,m.is_deleted,m.created_at,m.updated_at,
              u.full_name AS sender_name,u.avatar_url AS sender_avatar_url,
              rm.body AS reply_body,ru.full_name AS reply_sender_name
       FROM chat_messages m
       JOIN app_users u ON u.id=m.sender_id
       LEFT JOIN chat_messages rm ON rm.id=m.reply_to_id
       LEFT JOIN app_users ru ON ru.id=rm.sender_id
       WHERE m.channel_id=$1 ${beforeSql}
       ORDER BY m.id DESC LIMIT $2`,
      params,
    );
    response.json({ items: rows.reverse().map(mapMessage), hasMore: rows.length === limit });
  } catch (error) { next(error); }
});

router.post('/channels/:id/messages', async (request, response, next) => {
  const client = await pool.connect();
  try {
    const channelId = Number(request.params.id);
    const channel = await assertAccess(channelId, request.user.id);
    if (!channel) return response.status(404).json({ message: 'Chat topilmadi.' });
    const parsed = messageSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Xabar 1–5000 belgi oralig‘ida bo‘lsin.' });
    const data = parsed.data;
    if (data.replyToId) {
      const reply = await pool.query('SELECT id FROM chat_messages WHERE id=$1 AND channel_id=$2', [data.replyToId, channelId]);
      if (!reply.rows[0]) return response.status(400).json({ message: 'Javob berilayotgan xabar topilmadi.' });
    }
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO chat_messages(channel_id,sender_id,body,reply_to_id)
       VALUES($1,$2,$3,$4) RETURNING id`,
      [channelId, request.user.id, data.body, data.replyToId],
    );
    const messageId = rows[0].id;
    await client.query('UPDATE chat_channels SET last_message_at=NOW(),updated_at=NOW() WHERE id=$1', [channelId]);
    await client.query(
      `INSERT INTO chat_channel_members(channel_id,user_id,member_role,last_read_at)
       VALUES($1,$2,'member',NOW())
       ON CONFLICT(channel_id,user_id) DO UPDATE SET last_read_at=NOW()`,
      [channelId, request.user.id],
    );
    const recipients = channel.channel_type === 'general'
      ? await client.query(`SELECT u.id FROM app_users u LEFT JOIN user_preferences up ON up.user_id=u.id
          WHERE u.is_active=TRUE AND u.id<>$1
            AND COALESCE((up.preferences->>'chatNotifications')::boolean,TRUE)=TRUE`, [request.user.id])
      : await client.query(`SELECT cm.user_id AS id FROM chat_channel_members cm
          LEFT JOIN user_preferences up ON up.user_id=cm.user_id
          WHERE cm.channel_id=$1 AND cm.user_id<>$2
            AND COALESCE((up.preferences->>'chatNotifications')::boolean,TRUE)=TRUE`, [channelId, request.user.id]);
    const recipientIds = recipients.rows.map((row) => Number(row.id));
    if (recipientIds.length) {
      await client.query(
        `INSERT INTO notifications(user_id,notification_type,title,message,link_page,link_entity_id,metadata)
         SELECT unnest($1::bigint[]),'chat_message',$2,$3,'chat',$4,$5::jsonb`,
        [recipientIds, `${request.user.full_name} yangi xabar yubordi`, data.body.slice(0, 180), channelId, JSON.stringify({ channelId, messageId: Number(messageId) })],
      );
    }
    await client.query('COMMIT');
    publishRealtime('chat.message', {
      channelId,
      messageId: Number(messageId),
      senderId: Number(request.user.id),
      senderName: request.user.full_name,
      message: data.body.slice(0, 180),
    }, recipientIds.length ? recipientIds : null);
    if (recipientIds.length) {
      void sendPushToUsers(recipientIds, {
        title: request.user.full_name,
        body: data.body.slice(0, 180),
        icon: '/favicon-192.png',
        badge: '/favicon-32.png',
        url: `/chat?entityId=${channelId}`,
        tag: `chat-${channelId}`,
        renotify: true,
      });
    }
    const result = await pool.query(
      `SELECT m.id,m.channel_id,m.sender_id,m.body,m.reply_to_id,m.is_edited,m.is_deleted,m.created_at,m.updated_at,
              u.full_name AS sender_name,u.avatar_url AS sender_avatar_url,
              rm.body AS reply_body,ru.full_name AS reply_sender_name
       FROM chat_messages m JOIN app_users u ON u.id=m.sender_id
       LEFT JOIN chat_messages rm ON rm.id=m.reply_to_id LEFT JOIN app_users ru ON ru.id=rm.sender_id
       WHERE m.id=$1`,
      [messageId],
    );
    response.status(201).json({ item: mapMessage(result.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

router.patch('/channels/:id/read', async (request, response, next) => {
  try {
    const channelId = Number(request.params.id);
    if (!(await assertAccess(channelId, request.user.id))) return response.status(404).json({ message: 'Chat topilmadi.' });
    await pool.query(
      `INSERT INTO chat_channel_members(channel_id,user_id,member_role,last_read_at)
       VALUES($1,$2,'member',NOW()) ON CONFLICT(channel_id,user_id) DO UPDATE SET last_read_at=NOW()`,
      [channelId, request.user.id],
    );
    await pool.query(
      `UPDATE notifications SET is_read=TRUE,read_at=COALESCE(read_at,NOW())
       WHERE user_id=$1 AND link_page='chat' AND link_entity_id=$2 AND is_read=FALSE`,
      [request.user.id, channelId],
    );
    response.json({ ok: true });
  } catch (error) { next(error); }
});

router.put('/messages/:id', async (request, response, next) => {
  try {
    const parsed = z.object({ body: z.string().trim().min(1).max(5000) }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Xabar matnini tekshiring.' });
    const { rows } = await pool.query(
      `UPDATE chat_messages SET body=$1,is_edited=TRUE,updated_at=NOW()
       WHERE id=$2 AND sender_id=$3 AND is_deleted=FALSE RETURNING id`,
      [parsed.data.body, Number(request.params.id), request.user.id],
    );
    if (!rows[0]) return response.status(404).json({ message: 'Xabar topilmadi yoki uni tahrirlash mumkin emas.' });
    publishRealtime('chat.message.updated', { messageId: Number(request.params.id), body: parsed.data.body });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

router.delete('/messages/:id', async (request, response, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE chat_messages SET body='',is_deleted=TRUE,updated_at=NOW()
       WHERE id=$1 AND (sender_id=$2 OR $3='admin') RETURNING id`,
      [Number(request.params.id), request.user.id, request.user.role],
    );
    if (!rows[0]) return response.status(404).json({ message: 'Xabar topilmadi yoki uni o‘chirish mumkin emas.' });
    publishRealtime('chat.message.deleted', { messageId: Number(request.params.id) });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
