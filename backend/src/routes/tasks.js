import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';
import { publishRealtime } from '../services/realtime.js';
import { sendPushToUsers } from '../services/push.js';

const router = Router();
router.use(authRequired);

const taskSchema = z.object({
  title: z.string().trim().min(2).max(220),
  description: z.string().max(12000).default(''),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  branchId: z.coerce.number().int().positive().nullable().optional(),
  assignedTo: z.coerce.number().int().positive().nullable().optional(),
  campaignId: z.coerce.number().int().positive().nullable().optional(),
  contentId: z.coerce.number().int().positive().nullable().optional(),
  startAt: z.string().datetime().nullable().optional().or(z.literal('')),
  dueAt: z.string().datetime().nullable().optional().or(z.literal('')),
  estimatedMinutes: z.coerce.number().int().min(0).max(100000).default(0),
  spentMinutes: z.coerce.number().int().min(0).max(100000).default(0),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

const statusSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled']),
  comment: z.string().max(1000).optional().default(''),
});

const commentSchema = z.object({ body: z.string().trim().min(1).max(4000) });

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapTask(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    branchId: numberOrNull(row.branch_id),
    branchName: row.branch_name || null,
    assignedTo: numberOrNull(row.assigned_to),
    assigneeName: row.assignee_name || null,
    assigneeRole: row.assignee_role || null,
    campaignId: numberOrNull(row.campaign_id),
    campaignName: row.campaign_name || null,
    contentId: numberOrNull(row.content_id),
    contentTitle: row.content_title || null,
    startAt: row.start_at,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    estimatedMinutes: Number(row.estimated_minutes || 0),
    spentMinutes: Number(row.spent_minutes || 0),
    tags: row.tags || [],
    createdBy: Number(row.created_by),
    creatorName: row.creator_name || null,
    commentCount: Number(row.comment_count || 0),
    isOverdue: Boolean(row.is_overdue),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const taskSelect = `
  SELECT t.*,
         b.name AS branch_name,
         assignee.full_name AS assignee_name,
         assignee.role AS assignee_role,
         creator.full_name AS creator_name,
         c.name AS campaign_name,
         ci.title AS content_title,
         (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id=t.id)::int AS comment_count,
         (t.due_at IS NOT NULL AND t.due_at < NOW() AND t.status NOT IN ('done','cancelled')) AS is_overdue
  FROM tasks t
  LEFT JOIN branches b ON b.id=t.branch_id
  LEFT JOIN app_users assignee ON assignee.id=t.assigned_to
  LEFT JOIN app_users creator ON creator.id=t.created_by
  LEFT JOIN campaigns c ON c.id=t.campaign_id
  LEFT JOIN content_items ci ON ci.id=t.content_id
`;

router.get('/summary', permissionRequired('tasks.view', 'tasks.manage'), async (request, response, next) => {
  try {
    const params = [];
    let branchCondition = '';
    if (request.query.branchId) {
      params.push(Number(request.query.branchId));
      branchCondition = `AND branch_id=$${params.length}`;
    }
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('backlog','todo','in_progress','review'))::int AS open,
        COUNT(*) FILTER (WHERE status='in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE status='review')::int AS review,
        COUNT(*) FILTER (WHERE status='done')::int AS done,
        COUNT(*) FILTER (WHERE due_at IS NOT NULL AND due_at < NOW() AND status NOT IN ('done','cancelled'))::int AS overdue,
        COUNT(*) FILTER (WHERE due_at >= NOW() AND due_at < NOW() + INTERVAL '7 days' AND status NOT IN ('done','cancelled'))::int AS due_this_week
      FROM tasks
      WHERE TRUE ${branchCondition}
    `, params);
    response.json({ metrics: rows[0] });
  } catch (error) { next(error); }
});

router.get('/', permissionRequired('tasks.view', 'tasks.manage'), async (request, response, next) => {
  try {
    const conditions = [];
    const params = [];
    if (request.query.search) {
      params.push(`%${request.query.search}%`);
      conditions.push(`(t.title ILIKE $${params.length} OR t.description ILIKE $${params.length} OR $${params.length}=ANY(t.tags))`);
    }
    if (request.query.status) {
      params.push(request.query.status);
      conditions.push(`t.status=$${params.length}`);
    }
    if (request.query.priority) {
      params.push(request.query.priority);
      conditions.push(`t.priority=$${params.length}`);
    }
    if (request.query.branchId) {
      params.push(Number(request.query.branchId));
      conditions.push(`t.branch_id=$${params.length}`);
    }
    if (request.query.assignedTo) {
      params.push(Number(request.query.assignedTo));
      conditions.push(`t.assigned_to=$${params.length}`);
    }
    if (request.query.mine === 'true') {
      params.push(request.user.id);
      conditions.push(`t.assigned_to=$${params.length}`);
    }
    if (request.query.overdue === 'true') conditions.push(`t.due_at < NOW() AND t.status NOT IN ('done','cancelled')`);
    if (request.query.from) {
      params.push(request.query.from);
      conditions.push(`COALESCE(t.due_at,t.created_at) >= $${params.length}::timestamptz`);
    }
    if (request.query.to) {
      params.push(request.query.to);
      conditions.push(`COALESCE(t.due_at,t.created_at) < ($${params.length}::timestamptz + INTERVAL '1 day')`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`${taskSelect} ${where} ORDER BY
      CASE t.status WHEN 'in_progress' THEN 1 WHEN 'review' THEN 2 WHEN 'todo' THEN 3 WHEN 'backlog' THEN 4 WHEN 'done' THEN 5 ELSE 6 END,
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.due_at NULLS LAST, t.created_at DESC`, params);
    response.json({ items: rows.map(mapTask) });
  } catch (error) { next(error); }
});

router.get('/:id', permissionRequired('tasks.view', 'tasks.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const [taskResult, commentsResult, historyResult] = await Promise.all([
      pool.query(`${taskSelect} WHERE t.id=$1 LIMIT 1`, [id]),
      pool.query(`SELECT tc.id,tc.body,tc.created_at,u.id AS user_id,u.full_name,u.role
                  FROM task_comments tc JOIN app_users u ON u.id=tc.user_id
                  WHERE tc.task_id=$1 ORDER BY tc.created_at ASC`, [id]),
      pool.query(`SELECT h.id,h.old_status,h.new_status,h.comment,h.created_at,u.full_name
                  FROM task_status_history h LEFT JOIN app_users u ON u.id=h.changed_by
                  WHERE h.task_id=$1 ORDER BY h.created_at DESC`, [id]),
    ]);
    if (!taskResult.rows[0]) return response.status(404).json({ message: 'Vazifa topilmadi.' });
    response.json({
      item: mapTask(taskResult.rows[0]),
      comments: commentsResult.rows.map((row) => ({ id: Number(row.id), body: row.body, createdAt: row.created_at, user: { id: Number(row.user_id), fullName: row.full_name, role: row.role } })),
      history: historyResult.rows.map((row) => ({ id: Number(row.id), oldStatus: row.old_status, newStatus: row.new_status, comment: row.comment, createdAt: row.created_at, userName: row.full_name || 'Tizim' })),
    });
  } catch (error) { next(error); }
});

router.post('/', permissionRequired('tasks.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const parsed = taskSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Vazifa ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO tasks(title,description,status,priority,branch_id,assigned_to,campaign_id,content_id,start_at,due_at,estimated_minutes,spent_minutes,tags,created_by,completed_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CASE WHEN $3='done' THEN NOW() ELSE NULL END)
      RETURNING id`, [data.title, data.description, data.status, data.priority, data.branchId || null, data.assignedTo || null, data.campaignId || null, data.contentId || null, data.startAt || null, data.dueAt || null, data.estimatedMinutes, data.spentMinutes, data.tags, request.user.id]);
    const id = Number(rows[0].id);
    await client.query(`INSERT INTO task_status_history(task_id,old_status,new_status,changed_by,comment) VALUES($1,NULL,$2,$3,'Vazifa yaratildi')`, [id, data.status, request.user.id]);
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'task.create',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ taskId: id, title: data.title })]);
    if (data.assignedTo && Number(data.assignedTo) !== Number(request.user.id)) {
      await client.query(`INSERT INTO notifications(user_id,notification_type,title,message,link_page,link_entity_id,dedupe_key)
        SELECT $1,'task_assigned','Sizga yangi vazifa biriktirildi',$2,'tasks',$3,$4
        WHERE COALESCE((SELECT (preferences->>'taskNotifications')::boolean FROM user_preferences WHERE user_id=$1),TRUE)=TRUE
        ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
        [data.assignedTo, data.title, id, `task-assigned-${id}`]);
    }
    await client.query('COMMIT');
    const result = await pool.query(`${taskSelect} WHERE t.id=$1`, [id]);
    const item = mapTask(result.rows[0]);
    publishRealtime('task.created', { item });
    if (item.assignedTo && Number(item.assignedTo) !== Number(request.user.id)) {
      publishRealtime('task.assigned', { taskId: item.id, title: item.title, message: item.title }, [item.assignedTo]);
      void sendPushToUsers([item.assignedTo], { title: 'Yangi vazifa', body: item.title, icon: '/favicon-192.png', badge: '/favicon-32.png', url: `/vazifalar?entityId=${item.id}`, tag: `task-${item.id}` });
    }
    response.status(201).json({ item });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

router.put('/:id', permissionRequired('tasks.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const id = Number(request.params.id);
    const parsed = taskSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Vazifa ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    await client.query('BEGIN');
    const old = await client.query('SELECT status,assigned_to FROM tasks WHERE id=$1 FOR UPDATE', [id]);
    if (!old.rows[0]) {
      await client.query('ROLLBACK');
      return response.status(404).json({ message: 'Vazifa topilmadi.' });
    }
    await client.query(`UPDATE tasks SET title=$1,description=$2,status=$3,priority=$4,branch_id=$5,assigned_to=$6,campaign_id=$7,content_id=$8,start_at=$9,due_at=$10,estimated_minutes=$11,spent_minutes=$12,tags=$13,completed_at=CASE WHEN $3='done' THEN COALESCE(completed_at,NOW()) ELSE NULL END WHERE id=$14`, [data.title, data.description, data.status, data.priority, data.branchId || null, data.assignedTo || null, data.campaignId || null, data.contentId || null, data.startAt || null, data.dueAt || null, data.estimatedMinutes, data.spentMinutes, data.tags, id]);
    if (old.rows[0].status !== data.status) {
      await client.query(`INSERT INTO task_status_history(task_id,old_status,new_status,changed_by,comment) VALUES($1,$2,$3,$4,'Vazifa tahrirlandi')`, [id, old.rows[0].status, data.status, request.user.id]);
    }
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'task.update',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ taskId: id, title: data.title })]);
    if (data.assignedTo && Number(data.assignedTo) !== Number(old.rows[0].assigned_to || 0) && Number(data.assignedTo) !== Number(request.user.id)) {
      await client.query(`INSERT INTO notifications(user_id,notification_type,title,message,link_page,link_entity_id,dedupe_key)
        SELECT $1,'task_assigned','Sizga vazifa biriktirildi',$2,'tasks',$3,$4
        WHERE COALESCE((SELECT (preferences->>'taskNotifications')::boolean FROM user_preferences WHERE user_id=$1),TRUE)=TRUE
        ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
        [data.assignedTo, data.title, id, `task-reassigned-${id}-${data.assignedTo}`]);
    }
    await client.query('COMMIT');
    const result = await pool.query(`${taskSelect} WHERE t.id=$1`, [id]);
    const item = mapTask(result.rows[0]);
    publishRealtime('task.updated', { item });
    if (data.assignedTo && Number(data.assignedTo) !== Number(old.rows[0].assigned_to || 0) && Number(data.assignedTo) !== Number(request.user.id)) {
      publishRealtime('task.assigned', { taskId: item.id, title: item.title, message: item.title }, [Number(data.assignedTo)]);
      void sendPushToUsers([Number(data.assignedTo)], { title: 'Vazifa sizga biriktirildi', body: item.title, icon: '/favicon-192.png', badge: '/favicon-32.png', url: `/vazifalar?entityId=${item.id}`, tag: `task-${item.id}` });
    }
    response.json({ item });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

router.patch('/:id/status', permissionRequired('tasks.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const id = Number(request.params.id);
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Vazifa statusi noto‘g‘ri.' });
    await client.query('BEGIN');
    const old = await client.query('SELECT status,title FROM tasks WHERE id=$1 FOR UPDATE', [id]);
    if (!old.rows[0]) {
      await client.query('ROLLBACK');
      return response.status(404).json({ message: 'Vazifa topilmadi.' });
    }
    await client.query(`UPDATE tasks SET status=$1,completed_at=CASE WHEN $1='done' THEN COALESCE(completed_at,NOW()) ELSE NULL END WHERE id=$2`, [parsed.data.status, id]);
    if (old.rows[0].status !== parsed.data.status) {
      await client.query(`INSERT INTO task_status_history(task_id,old_status,new_status,changed_by,comment) VALUES($1,$2,$3,$4,$5)`, [id, old.rows[0].status, parsed.data.status, request.user.id, parsed.data.comment || null]);
    }
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'task.status',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ taskId: id, status: parsed.data.status })]);
    await client.query('COMMIT');
    const result = await pool.query(`${taskSelect} WHERE t.id=$1`, [id]);
    const item = mapTask(result.rows[0]);
    const recipients = [...new Set([item.assignedTo, item.createdBy].filter((userId) => userId && Number(userId) !== Number(request.user.id)))];
    publishRealtime('task.status', { taskId: item.id, title: item.title, status: item.status, message: `${item.title}: ${item.status}` }, recipients.length ? recipients : null);
    if (recipients.length) void sendPushToUsers(recipients, { title: 'Vazifa statusi yangilandi', body: `${item.title}: ${item.status}`, icon: '/favicon-192.png', badge: '/favicon-32.png', url: `/vazifalar?entityId=${item.id}`, tag: `task-${item.id}` });
    response.json({ item });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

router.post('/:id/comments', permissionRequired('tasks.view', 'tasks.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const parsed = commentSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Izoh matnini kiriting.' });
    const exists = await pool.query('SELECT 1 FROM tasks WHERE id=$1', [id]);
    if (!exists.rowCount) return response.status(404).json({ message: 'Vazifa topilmadi.' });
    const { rows } = await pool.query(`INSERT INTO task_comments(task_id,user_id,body) VALUES($1,$2,$3) RETURNING id,body,created_at`, [id, request.user.id, parsed.data.body]);
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'task.comment',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ taskId: id })]);
    publishRealtime('task.comment', { taskId: id, message: parsed.data.body.slice(0, 180), userId: Number(request.user.id) });
    response.status(201).json({ comment: { id: Number(rows[0].id), body: rows[0].body, createdAt: rows[0].created_at, user: { id: Number(request.user.id), fullName: request.user.full_name, role: request.user.role } } });
  } catch (error) { next(error); }
});

router.delete('/:id', permissionRequired('tasks.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('DELETE FROM tasks WHERE id=$1 RETURNING id,title', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Vazifa topilmadi.' });
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'task.delete',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ taskId: id, title: rows[0].title })]);
    publishRealtime('task.deleted', { taskId: id, title: rows[0].title });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
