import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';
import { publishRealtime } from '../services/realtime.js';
import { sendPushToUsers } from '../services/push.js';

const router = Router();

const CONTENT_TYPES = ['post', 'reels', 'story', 'shorts', 'video', 'carousel', 'banner', 'live'];
const STATUSES = ['draft', 'review', 'changes_requested', 'approved', 'scheduled', 'published', 'cancelled'];

const nullableId = z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value === '' || value == null ? null : value));

const contentSchema = z.object({
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(10000).default(''),
  contentType: z.enum(CONTENT_TYPES),
  platformId: z.coerce.number().int().positive(),
  branchId: nullableId,
  assignedTo: nullableId,
  templateId: nullableId,
  coverMediaId: nullableId,
  status: z.enum(STATUSES).default('draft'),
  publishAt: z.union([z.string(), z.null(), z.undefined()])
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), 'Nashr sanasi noto‘g‘ri.')
    .transform((value) => (value ? new Date(value).toISOString() : null)),
  coverUrl: z.union([z.string().url(), z.literal(''), z.null(), z.undefined()]).transform((value) => (value || null)),
  notes: z.string().trim().max(5000).default(''),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});

const statusSchema = z.object({
  status: z.enum(STATUSES),
  comment: z.string().trim().max(3000).optional().default(''),
});

const scheduleSchema = z.object({
  publishAt: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Nashr sanasi noto‘g‘ri.'),
});

const commentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  commentType: z.enum(['comment','change_request','approval']).default('comment'),
});

function contentSelect() {
  return `
    SELECT
      c.id,c.title,c.description,c.content_type,c.status,c.publish_at,c.published_at,c.cover_url,c.cover_media_id,c.notes,c.tags,
      c.template_id,c.created_at,c.updated_at,c.last_activity_at,c.deleted_at,
      p.id AS platform_id,p.code AS platform_code,p.name AS platform_name,p.color AS platform_color,
      b.id AS branch_id,b.name AS branch_name,
      u.id AS assigned_to,u.full_name AS assignee_name,
      creator.full_name AS creator_name,
      t.name AS template_name,
      media.display_name AS cover_media_name, media.mime_type AS cover_media_mime
    FROM content_items c
    JOIN platforms p ON p.id=c.platform_id
    LEFT JOIN branches b ON b.id=c.branch_id
    LEFT JOIN app_users u ON u.id=c.assigned_to
    JOIN app_users creator ON creator.id=c.created_by
    LEFT JOIN content_templates t ON t.id=c.template_id
    LEFT JOIN media_assets media ON media.id=c.cover_media_id
  `;
}

function mapContent(row) {
  return {
    id: Number(row.id), title: row.title, description: row.description, contentType: row.content_type,
    status: row.status, publishAt: row.publish_at, publishedAt: row.published_at, coverUrl: row.cover_url,
    coverMediaId: row.cover_media_id ? Number(row.cover_media_id) : null,
    coverMedia: row.cover_media_id ? { id: Number(row.cover_media_id), displayName: row.cover_media_name, mimeType: row.cover_media_mime, fileUrl: `/api/media/${row.cover_media_id}/file` } : null,
    notes: row.notes, tags: row.tags || [], templateId: row.template_id ? Number(row.template_id) : null,
    templateName: row.template_name || null, createdAt: row.created_at, updatedAt: row.updated_at,
    lastActivityAt: row.last_activity_at, deletedAt: row.deleted_at,
    platform: { id: Number(row.platform_id), code: row.platform_code, name: row.platform_name, color: row.platform_color },
    branch: row.branch_id ? { id: Number(row.branch_id), name: row.branch_name } : null,
    assignee: row.assigned_to ? { id: Number(row.assigned_to), fullName: row.assignee_name } : null,
    creatorName: row.creator_name,
  };
}

async function getContentById(id, includeDeleted = false) {
  const { rows } = await pool.query(`${contentSelect()} WHERE c.id=$1 ${includeDeleted ? '' : 'AND c.deleted_at IS NULL'} LIMIT 1`, [id]);
  return rows[0] ? mapContent(rows[0]) : null;
}

async function createNotification(client, userId, type, title, message, contentId, dedupeKey = null) {
  if (!userId) return;
  await client.query(
    `INSERT INTO notifications(user_id,notification_type,title,message,link_page,link_entity_id,dedupe_key)
     VALUES($1,$2,$3,$4,'content',$5,$6)
     ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO UPDATE SET title=EXCLUDED.title,message=EXCLUDED.message,is_read=FALSE,read_at=NULL,created_at=NOW()`,
    [userId,type,title,message,contentId,dedupeKey],
  ).catch(() => {});
}

router.use(authRequired);

router.get('/', permissionRequired('content.view'), async (request, response, next) => {
  try {
    const conditions = ['c.deleted_at IS NULL'];
    const params = [];
    const add = (sql, value) => { params.push(value); conditions.push(sql.replace('?', `$${params.length}`)); };
    if (request.query.search) {
      const term = `%${request.query.search}%`;
      params.push(term, term, term);
      conditions.push(`(c.title ILIKE $${params.length - 2} OR c.description ILIKE $${params.length - 1} OR $${params.length}=ANY(c.tags))`);
    }
    if (request.query.status) add('c.status=?', request.query.status);
    if (request.query.platformId) add('c.platform_id=?', Number(request.query.platformId));
    if (request.query.branchId) add('c.branch_id=?', Number(request.query.branchId));
    if (request.query.assignedTo) add('c.assigned_to=?', Number(request.query.assignedTo));
    if (request.query.from) add('c.publish_at>=?', new Date(request.query.from).toISOString());
    if (request.query.to) add('c.publish_at<?', new Date(request.query.to).toISOString());
    const limit = Math.min(Math.max(Number(request.query.limit) || 100, 1), 250);
    params.push(limit);
    const { rows } = await pool.query(`${contentSelect()} WHERE ${conditions.join(' AND ')} ORDER BY c.publish_at ASC NULLS LAST,c.created_at DESC LIMIT $${params.length}`, params);
    response.json({ items: rows.map(mapContent), total: rows.length });
  } catch (error) { next(error); }
});

router.get('/:id', permissionRequired('content.view'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const item = await getContentById(id);
    if (!item) return response.status(404).json({ message: 'Kontent topilmadi.' });
    const [comments, history] = await Promise.all([
      pool.query(`SELECT cc.id,cc.body,cc.comment_type,cc.created_at,u.id AS user_id,u.full_name,u.role FROM content_comments cc JOIN app_users u ON u.id=cc.user_id WHERE cc.content_id=$1 ORDER BY cc.created_at ASC`, [id]),
      pool.query(`SELECT h.id,h.old_status,h.new_status,h.comment,h.created_at,u.full_name AS changed_by FROM content_status_history h LEFT JOIN app_users u ON u.id=h.changed_by WHERE h.content_id=$1 ORDER BY h.created_at DESC`, [id]),
    ]);
    return response.json({ item, comments: comments.rows.map((row) => ({ id: Number(row.id), body: row.body, commentType: row.comment_type, createdAt: row.created_at, user: { id: Number(row.user_id), fullName: row.full_name, role: row.role } })), history: history.rows.map((row) => ({ id: Number(row.id), oldStatus: row.old_status, newStatus: row.new_status, comment: row.comment, createdAt: row.created_at, changedBy: row.changed_by })) });
  } catch (error) { return next(error); }
});

router.post('/', permissionRequired('content.create'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const parsed = contentSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Kontent ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const d = parsed.data;
    await client.query('BEGIN');
    const { rows } = await client.query(`INSERT INTO content_items(title,description,content_type,platform_id,branch_id,assigned_to,template_id,status,publish_at,published_at,cover_url,cover_media_id,notes,tags,created_by,last_activity_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW()) RETURNING id`, [d.title,d.description,d.contentType,d.platformId,d.branchId,d.assignedTo,d.templateId,d.status,d.publishAt,d.status==='published'?new Date().toISOString():null,d.coverUrl,d.coverMediaId,d.notes,d.tags,request.user.id]);
    const id = Number(rows[0].id);
    await client.query(`INSERT INTO content_status_history(content_id,old_status,new_status,changed_by,comment) VALUES($1,NULL,$2,$3,'Kontent yaratildi')`, [id,d.status,request.user.id]);
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'content.create',$2,$3::jsonb)`, [request.user.id,request.ip,JSON.stringify({ contentId:id,title:d.title })]);
    if (d.assignedTo && Number(d.assignedTo) !== Number(request.user.id)) await createNotification(client,d.assignedTo,'content_assigned','Yangi kontent biriktirildi',d.title,id,`content-assigned-${id}`);
    await client.query('COMMIT');
    if (d.coverMediaId) await pool.query('UPDATE media_assets SET last_used_at=NOW() WHERE id=$1', [d.coverMediaId]).catch(() => {});
    const item = await getContentById(id);
    publishRealtime('content.created', { item }, d.assignedTo ? [d.assignedTo] : null);
    if (d.assignedTo && Number(d.assignedTo) !== Number(request.user.id)) void sendPushToUsers([Number(d.assignedTo)], { title: 'Yangi kontent biriktirildi', body: d.title, icon: '/favicon-192.png', badge: '/favicon-32.png', url: `/content?entityId=${id}`, tag: `content-${id}` });
    return response.status(201).json({ item });
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); return next(error); } finally { client.release(); }
});

router.put('/:id', permissionRequired('content.edit'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const id = Number(request.params.id);
    const parsed = contentSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Kontent ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const current = await client.query('SELECT status,assigned_to,title FROM content_items WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (!current.rows[0]) return response.status(404).json({ message: 'Kontent topilmadi.' });
    const d = parsed.data;
    await client.query('BEGIN');
    await client.query(`UPDATE content_items SET title=$1,description=$2,content_type=$3,platform_id=$4,branch_id=$5,assigned_to=$6,template_id=$7,status=$8,publish_at=$9,published_at=CASE WHEN $8='published' AND published_at IS NULL THEN NOW() WHEN $8<>'published' THEN NULL ELSE published_at END,cover_url=$10,cover_media_id=$11,notes=$12,tags=$13,last_activity_at=NOW() WHERE id=$14`, [d.title,d.description,d.contentType,d.platformId,d.branchId,d.assignedTo,d.templateId,d.status,d.publishAt,d.coverUrl,d.coverMediaId,d.notes,d.tags,id]);
    if (current.rows[0].status !== d.status) await client.query(`INSERT INTO content_status_history(content_id,old_status,new_status,changed_by) VALUES($1,$2,$3,$4)`, [id,current.rows[0].status,d.status,request.user.id]);
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'content.update',$2,$3::jsonb)`, [request.user.id,request.ip,JSON.stringify({ contentId:id,title:d.title })]);
    if (d.assignedTo && Number(d.assignedTo) !== Number(current.rows[0].assigned_to)) await createNotification(client,d.assignedTo,'content_assigned','Kontent sizga biriktirildi',d.title,id,`content-assigned-${id}-${d.assignedTo}`);
    await client.query('COMMIT');
    if (d.coverMediaId) await pool.query('UPDATE media_assets SET last_used_at=NOW() WHERE id=$1', [d.coverMediaId]).catch(() => {});
    const item = await getContentById(id);
    publishRealtime('content.updated', { item });
    if (d.assignedTo && Number(d.assignedTo) !== Number(current.rows[0].assigned_to) && Number(d.assignedTo) !== Number(request.user.id)) void sendPushToUsers([Number(d.assignedTo)], { title: 'Kontent sizga biriktirildi', body: d.title, icon: '/favicon-192.png', badge: '/favicon-32.png', url: `/content?entityId=${id}`, tag: `content-${id}` });
    return response.json({ item });
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); return next(error); } finally { client.release(); }
});

router.patch('/:id/schedule', permissionRequired('content.edit'), async (request, response, next) => {
  try {
    const parsed = scheduleSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Sana noto‘g‘ri.' });
    const id = Number(request.params.id);
    const { rows } = await pool.query(`UPDATE content_items SET publish_at=$1,status=CASE WHEN status IN ('draft','approved') THEN 'scheduled' ELSE status END,last_activity_at=NOW() WHERE id=$2 AND deleted_at IS NULL RETURNING id,title,publish_at,status`, [new Date(parsed.data.publishAt).toISOString(),id]);
    if (!rows[0]) return response.status(404).json({ message: 'Kontent topilmadi.' });
    publishRealtime('content.scheduled', { id, publishAt: rows[0].publish_at, status: rows[0].status });
    return response.json({ ok:true,item:await getContentById(id) });
  } catch (error) { return next(error); }
});

router.patch('/:id/status', permissionRequired('content.edit'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Status ma’lumotlarini tekshiring.' });
    const id = Number(request.params.id);
    const current = await client.query('SELECT status,title,created_by,assigned_to FROM content_items WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (!current.rows[0]) return response.status(404).json({ message: 'Kontent topilmadi.' });
    await client.query('BEGIN');
    await client.query(`UPDATE content_items SET status=$1,published_at=CASE WHEN $1='published' THEN COALESCE(published_at,NOW()) ELSE published_at END,last_activity_at=NOW() WHERE id=$2`, [parsed.data.status,id]);
    await client.query(`INSERT INTO content_status_history(content_id,old_status,new_status,changed_by,comment) VALUES($1,$2,$3,$4,$5)`, [id,current.rows[0].status,parsed.data.status,request.user.id,parsed.data.comment || null]);
    if (parsed.data.comment) await client.query(`INSERT INTO content_comments(content_id,user_id,body,comment_type) VALUES($1,$2,$3,$4)`, [id,request.user.id,parsed.data.comment,parsed.data.status==='changes_requested'?'change_request':parsed.data.status==='approved'?'approval':'comment']);
    const recipients = [...new Set([current.rows[0].created_by,current.rows[0].assigned_to].filter(Boolean).map(Number))].filter((value) => value !== Number(request.user.id));
    for (const userId of recipients) await createNotification(client,userId,'content_status',`Kontent statusi: ${parsed.data.status}`,current.rows[0].title,id,`content-status-${id}-${parsed.data.status}-${Date.now()}`);
    await client.query('COMMIT');
    publishRealtime('content.status', { id,status:parsed.data.status,comment:parsed.data.comment,title:current.rows[0].title,message:`${current.rows[0].title}: ${parsed.data.status}` }, recipients);
    if (recipients.length) void sendPushToUsers(recipients, { title: 'Kontent statusi yangilandi', body: `${current.rows[0].title}: ${parsed.data.status}`, icon: '/favicon-192.png', badge: '/favicon-32.png', url: `/content?entityId=${id}`, tag: `content-${id}` });
    return response.json({ item:await getContentById(id) });
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); return next(error); } finally { client.release(); }
});

router.get('/:id/comments', permissionRequired('content.view'), async (request, response, next) => {
  try {
    const { rows } = await pool.query(`SELECT cc.id,cc.body,cc.comment_type,cc.created_at,u.id AS user_id,u.full_name,u.role FROM content_comments cc JOIN app_users u ON u.id=cc.user_id WHERE cc.content_id=$1 ORDER BY cc.created_at ASC`, [Number(request.params.id)]);
    response.json({ items:rows.map((row) => ({ id:Number(row.id),body:row.body,commentType:row.comment_type,createdAt:row.created_at,user:{ id:Number(row.user_id),fullName:row.full_name,role:row.role } })) });
  } catch (error) { next(error); }
});

router.post('/:id/comments', permissionRequired('content.view'), async (request, response, next) => {
  try {
    const parsed = commentSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Izoh matnini kiriting.' });
    const id = Number(request.params.id);
    const content = await pool.query('SELECT id,title,created_by,assigned_to FROM content_items WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (!content.rows[0]) return response.status(404).json({ message: 'Kontent topilmadi.' });
    const { rows } = await pool.query(`INSERT INTO content_comments(content_id,user_id,body,comment_type) VALUES($1,$2,$3,$4) RETURNING id,body,comment_type,created_at`, [id,request.user.id,parsed.data.body,parsed.data.commentType]);
    await pool.query('UPDATE content_items SET last_activity_at=NOW() WHERE id=$1',[id]);
    const recipients = [...new Set([content.rows[0].created_by,content.rows[0].assigned_to].filter(Boolean).map(Number))].filter((value) => value !== Number(request.user.id));
    for (const userId of recipients) await createNotification(pool,userId,'content_comment','Kontentga yangi izoh',`${request.user.full_name}: ${parsed.data.body.slice(0,120)}`,id,`content-comment-${rows[0].id}-${userId}`);
    const item = { id:Number(rows[0].id),body:rows[0].body,commentType:rows[0].comment_type,createdAt:rows[0].created_at,user:{ id:Number(request.user.id),fullName:request.user.full_name,role:request.user.role } };
    publishRealtime('content.comment', { contentId:id,item,message:parsed.data.body.slice(0,180) }, recipients);
    if (recipients.length) void sendPushToUsers(recipients, { title: 'Kontentga yangi izoh', body: `${request.user.full_name}: ${parsed.data.body.slice(0,140)}`, icon: '/favicon-192.png', badge: '/favicon-32.png', url: `/content?entityId=${id}`, tag: `content-comment-${id}` });
    response.status(201).json({ item });
  } catch (error) { next(error); }
});

router.delete('/:id', permissionRequired('content.delete'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('UPDATE content_items SET deleted_at=NOW(),last_activity_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id,title', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Kontent topilmadi.' });
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'content.delete',$2,$3::jsonb)`, [request.user.id,request.ip,JSON.stringify({ contentId:id,title:rows[0].title })]);
    publishRealtime('content.deleted', { id,title:rows[0].title });
    return response.json({ ok:true,undoToken:String(id) });
  } catch (error) { return next(error); }
});

router.post('/:id/restore', permissionRequired('content.delete'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('UPDATE content_items SET deleted_at=NULL,last_activity_at=NOW() WHERE id=$1 AND deleted_at IS NOT NULL RETURNING id', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Qaytariladigan kontent topilmadi.' });
    publishRealtime('content.restored', { id });
    response.json({ item:await getContentById(id) });
  } catch (error) { next(error); }
});

export default router;
