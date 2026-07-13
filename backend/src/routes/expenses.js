import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';
import { publishRealtime } from '../services/realtime.js';
import { sendPushToUsers } from '../services/push.js';

const router = Router();
router.use(authRequired);

const expenseSchema = z.object({
  title: z.string().trim().min(2).max(220),
  description: z.string().max(12000).default(''),
  categoryId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive().nullable().optional(),
  campaignId: z.coerce.number().int().positive().nullable().optional(),
  amount: z.coerce.number().min(0.01).max(999999999999),
  expenseDate: z.string().date(),
  status: z.enum(['draft', 'pending', 'approved', 'paid', 'rejected', 'cancelled']).default('pending'),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'corporate_card', 'other']).default('transfer'),
  vendor: z.string().trim().max(220).default(''),
  receiptMediaId: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().max(12000).default(''),
});

const statusSchema = z.object({
  status: z.enum(['draft', 'pending', 'approved', 'paid', 'rejected', 'cancelled']),
  comment: z.string().max(1000).optional().default(''),
});

const budgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.coerce.number().min(0).max(999999999999),
  branchId: z.coerce.number().int().positive().nullable().optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).default(''),
});

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapExpense(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    categoryId: Number(row.category_id),
    categoryCode: row.category_code,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    branchId: numberOrNull(row.branch_id),
    branchName: row.branch_name || null,
    campaignId: numberOrNull(row.campaign_id),
    campaignName: row.campaign_name || null,
    amount: Number(row.amount),
    expenseDate: row.expense_date,
    status: row.status,
    paymentMethod: row.payment_method,
    vendor: row.vendor,
    receiptMediaId: numberOrNull(row.receipt_media_id),
    receiptName: row.receipt_name || null,
    notes: row.notes,
    requestedBy: numberOrNull(row.requested_by),
    requesterName: row.requester_name || null,
    approvedBy: numberOrNull(row.approved_by),
    approverName: row.approver_name || null,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
    createdBy: Number(row.created_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const expenseSelect = `
  SELECT e.*,
         ec.code AS category_code, ec.name AS category_name, ec.color AS category_color,
         b.name AS branch_name,
         c.name AS campaign_name,
         requester.full_name AS requester_name,
         approver.full_name AS approver_name,
         ma.display_name AS receipt_name
  FROM expenses e
  JOIN expense_categories ec ON ec.id=e.category_id
  LEFT JOIN branches b ON b.id=e.branch_id
  LEFT JOIN campaigns c ON c.id=e.campaign_id
  LEFT JOIN app_users requester ON requester.id=e.requested_by
  LEFT JOIN app_users approver ON approver.id=e.approved_by
  LEFT JOIN media_assets ma ON ma.id=e.receipt_media_id
`;

router.get('/categories', permissionRequired('expenses.view', 'expenses.manage'), async (_request, response, next) => {
  try {
    const { rows } = await pool.query('SELECT id,code,name,color,is_active,sort_order FROM expense_categories WHERE is_active=TRUE ORDER BY sort_order,name');
    response.json({ items: rows.map((row) => ({ id: Number(row.id), code: row.code, name: row.name, color: row.color, isActive: row.is_active })) });
  } catch (error) { next(error); }
});

router.get('/summary', permissionRequired('expenses.view', 'expenses.manage'), async (request, response, next) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(String(request.query.month || '')) ? String(request.query.month) : new Date().toISOString().slice(0, 7);
    const branchId = request.query.branchId ? Number(request.query.branchId) : null;
    const [metricsResult, budgetResult, categoryResult] = await Promise.all([
      pool.query(`SELECT
          COALESCE(SUM(amount),0)::numeric AS total,
          COALESCE(SUM(amount) FILTER (WHERE status='pending'),0)::numeric AS pending,
          COALESCE(SUM(amount) FILTER (WHERE status='approved'),0)::numeric AS approved,
          COALESCE(SUM(amount) FILTER (WHERE status='paid'),0)::numeric AS paid,
          COUNT(*)::int AS count,
          COUNT(*) FILTER (WHERE status='pending')::int AS pending_count
        FROM expenses
        WHERE expense_date >= ($1 || '-01')::date
          AND expense_date < (($1 || '-01')::date + INTERVAL '1 month')
          AND ($2::bigint IS NULL OR branch_id=$2)`, [month, branchId]),
      pool.query(`SELECT COALESCE(SUM(amount),0)::numeric AS total
                  FROM expense_budgets
                  WHERE budget_month=($1 || '-01')::date AND ($2::bigint IS NULL OR branch_id=$2)`, [month, branchId]),
      pool.query(`SELECT ec.id,ec.name,ec.color,COALESCE(SUM(e.amount),0)::numeric AS total
                  FROM expense_categories ec
                  LEFT JOIN expenses e ON e.category_id=ec.id
                    AND e.expense_date >= ($1 || '-01')::date
                    AND e.expense_date < (($1 || '-01')::date + INTERVAL '1 month')
                    AND e.status NOT IN ('rejected','cancelled')
                    AND ($2::bigint IS NULL OR e.branch_id=$2)
                  WHERE ec.is_active=TRUE
                  GROUP BY ec.id,ec.name,ec.color,ec.sort_order
                  ORDER BY total DESC,ec.sort_order`, [month, branchId]),
    ]);
    const metrics = metricsResult.rows[0];
    const budget = Number(budgetResult.rows[0].total || 0);
    const spent = Number(metrics.paid || 0) + Number(metrics.approved || 0);
    response.json({
      month,
      metrics: {
        total: Number(metrics.total), pending: Number(metrics.pending), approved: Number(metrics.approved), paid: Number(metrics.paid),
        count: Number(metrics.count), pendingCount: Number(metrics.pending_count), budget, spent,
        remaining: Math.max(0, budget - spent), usedPercent: budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0,
      },
      categories: categoryResult.rows.map((row) => ({ id: Number(row.id), name: row.name, color: row.color, total: Number(row.total) })),
    });
  } catch (error) { next(error); }
});

router.get('/budgets', permissionRequired('expenses.view', 'expenses.manage'), async (request, response, next) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(String(request.query.month || '')) ? String(request.query.month) : new Date().toISOString().slice(0, 7);
    const { rows } = await pool.query(`SELECT eb.*,b.name AS branch_name,ec.name AS category_name,ec.color AS category_color
      FROM expense_budgets eb
      LEFT JOIN branches b ON b.id=eb.branch_id
      LEFT JOIN expense_categories ec ON ec.id=eb.category_id
      WHERE eb.budget_month=($1 || '-01')::date
      ORDER BY eb.branch_id NULLS FIRST,eb.category_id NULLS FIRST`, [month]);
    response.json({ items: rows.map((row) => ({ id: Number(row.id), month: String(row.budget_month).slice(0, 7), amount: Number(row.amount), branchId: numberOrNull(row.branch_id), branchName: row.branch_name || null, categoryId: numberOrNull(row.category_id), categoryName: row.category_name || null, categoryColor: row.category_color || null, notes: row.notes })) });
  } catch (error) { next(error); }
});

router.post('/budgets', permissionRequired('expenses.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const parsed = budgetSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Byudjet ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    const branchId = data.branchId || null;
    const categoryId = data.categoryId || null;
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT id FROM expense_budgets
       WHERE budget_month=($1 || '-01')::date
         AND branch_id IS NOT DISTINCT FROM $2::bigint
         AND category_id IS NOT DISTINCT FROM $3::bigint
       FOR UPDATE`,
      [data.month, branchId, categoryId],
    );
    let id;
    if (existing.rows[0]) {
      id = Number(existing.rows[0].id);
      await client.query('UPDATE expense_budgets SET amount=$1,notes=$2 WHERE id=$3', [data.amount, data.notes, id]);
    } else {
      const inserted = await client.query(
        `INSERT INTO expense_budgets(budget_month,branch_id,category_id,amount,notes,created_by)
         VALUES(($1 || '-01')::date,$2,$3,$4,$5,$6) RETURNING id`,
        [data.month, branchId, categoryId, data.amount, data.notes, request.user.id],
      );
      id = Number(inserted.rows[0].id);
    }
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'expense.budget.set',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ budgetId: id, month: data.month, amount: data.amount })]);
    await client.query('COMMIT');
    response.json({ ok: true, id });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

router.get('/', permissionRequired('expenses.view', 'expenses.manage'), async (request, response, next) => {
  try {
    const conditions = [];
    const params = [];
    if (request.query.search) {
      params.push(`%${request.query.search}%`);
      conditions.push(`(e.title ILIKE $${params.length} OR e.vendor ILIKE $${params.length} OR e.description ILIKE $${params.length})`);
    }
    if (request.query.status) {
      params.push(request.query.status);
      conditions.push(`e.status=$${params.length}`);
    }
    if (request.query.categoryId) {
      params.push(Number(request.query.categoryId));
      conditions.push(`e.category_id=$${params.length}`);
    }
    if (request.query.branchId) {
      params.push(Number(request.query.branchId));
      conditions.push(`e.branch_id=$${params.length}`);
    }
    if (request.query.month && /^\d{4}-\d{2}$/.test(String(request.query.month))) {
      params.push(String(request.query.month));
      conditions.push(`e.expense_date >= ($${params.length} || '-01')::date AND e.expense_date < (($${params.length} || '-01')::date + INTERVAL '1 month')`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`${expenseSelect} ${where} ORDER BY e.expense_date DESC,e.created_at DESC`, params);
    response.json({ items: rows.map(mapExpense) });
  } catch (error) { next(error); }
});

router.get('/:id', permissionRequired('expenses.view', 'expenses.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const [itemResult, historyResult] = await Promise.all([
      pool.query(`${expenseSelect} WHERE e.id=$1 LIMIT 1`, [id]),
      pool.query(`SELECT h.id,h.old_status,h.new_status,h.comment,h.created_at,u.full_name
                  FROM expense_status_history h LEFT JOIN app_users u ON u.id=h.changed_by
                  WHERE h.expense_id=$1 ORDER BY h.created_at DESC`, [id]),
    ]);
    if (!itemResult.rows[0]) return response.status(404).json({ message: 'Xarajat topilmadi.' });
    response.json({ item: mapExpense(itemResult.rows[0]), history: historyResult.rows.map((row) => ({ id: Number(row.id), oldStatus: row.old_status, newStatus: row.new_status, comment: row.comment, createdAt: row.created_at, userName: row.full_name || 'Tizim' })) });
  } catch (error) { next(error); }
});

router.post('/', permissionRequired('expenses.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const parsed = expenseSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Xarajat ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    await client.query('BEGIN');
    const approvedBy = ['approved', 'paid'].includes(data.status) ? request.user.id : null;
    const { rows } = await client.query(`INSERT INTO expenses(title,description,category_id,branch_id,campaign_id,amount,expense_date,status,payment_method,vendor,receipt_media_id,notes,requested_by,approved_by,approved_at,paid_at,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CASE WHEN $8 IN ('approved','paid') THEN NOW() ELSE NULL END,CASE WHEN $8='paid' THEN NOW() ELSE NULL END,$13)
      RETURNING id`, [data.title, data.description, data.categoryId, data.branchId || null, data.campaignId || null, data.amount, data.expenseDate, data.status, data.paymentMethod, data.vendor, data.receiptMediaId || null, data.notes, request.user.id, approvedBy]);
    const id = Number(rows[0].id);
    await client.query(`INSERT INTO expense_status_history(expense_id,old_status,new_status,changed_by,comment) VALUES($1,NULL,$2,$3,'Xarajat yaratildi')`, [id, data.status, request.user.id]);
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'expense.create',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ expenseId: id, title: data.title, amount: data.amount })]);
    await client.query('COMMIT');
    const result = await pool.query(`${expenseSelect} WHERE e.id=$1`, [id]);
    const item = mapExpense(result.rows[0]);
    publishRealtime('expense.created', { item });
    response.status(201).json({ item });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

router.put('/:id', permissionRequired('expenses.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const id = Number(request.params.id);
    const parsed = expenseSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Xarajat ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    await client.query('BEGIN');
    const old = await client.query('SELECT status FROM expenses WHERE id=$1 FOR UPDATE', [id]);
    if (!old.rows[0]) {
      await client.query('ROLLBACK');
      return response.status(404).json({ message: 'Xarajat topilmadi.' });
    }
    const approvedBy = ['approved', 'paid'].includes(data.status) ? request.user.id : null;
    await client.query(`UPDATE expenses SET title=$1,description=$2,category_id=$3,branch_id=$4,campaign_id=$5,amount=$6,expense_date=$7,status=$8,payment_method=$9,vendor=$10,receipt_media_id=$11,notes=$12,approved_by=CASE WHEN $8 IN ('approved','paid') THEN COALESCE(approved_by,$13) ELSE NULL END,approved_at=CASE WHEN $8 IN ('approved','paid') THEN COALESCE(approved_at,NOW()) ELSE NULL END,paid_at=CASE WHEN $8='paid' THEN COALESCE(paid_at,NOW()) ELSE NULL END WHERE id=$14`, [data.title, data.description, data.categoryId, data.branchId || null, data.campaignId || null, data.amount, data.expenseDate, data.status, data.paymentMethod, data.vendor, data.receiptMediaId || null, data.notes, approvedBy, id]);
    if (old.rows[0].status !== data.status) await client.query(`INSERT INTO expense_status_history(expense_id,old_status,new_status,changed_by,comment) VALUES($1,$2,$3,$4,'Xarajat tahrirlandi')`, [id, old.rows[0].status, data.status, request.user.id]);
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'expense.update',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ expenseId: id, title: data.title, amount: data.amount })]);
    await client.query('COMMIT');
    const result = await pool.query(`${expenseSelect} WHERE e.id=$1`, [id]);
    const item = mapExpense(result.rows[0]);
    publishRealtime('expense.updated', { item });
    response.json({ item });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

router.patch('/:id/status', permissionRequired('expenses.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const id = Number(request.params.id);
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Xarajat statusi noto‘g‘ri.' });
    await client.query('BEGIN');
    const old = await client.query('SELECT status,title,requested_by,created_by FROM expenses WHERE id=$1 FOR UPDATE', [id]);
    if (!old.rows[0]) {
      await client.query('ROLLBACK');
      return response.status(404).json({ message: 'Xarajat topilmadi.' });
    }
    await client.query(`UPDATE expenses SET status=$1,approved_by=CASE WHEN $1 IN ('approved','paid') THEN $2 ELSE NULL END,approved_at=CASE WHEN $1 IN ('approved','paid') THEN COALESCE(approved_at,NOW()) ELSE NULL END,paid_at=CASE WHEN $1='paid' THEN COALESCE(paid_at,NOW()) ELSE NULL END WHERE id=$3`, [parsed.data.status, request.user.id, id]);
    if (old.rows[0].status !== parsed.data.status) await client.query(`INSERT INTO expense_status_history(expense_id,old_status,new_status,changed_by,comment) VALUES($1,$2,$3,$4,$5)`, [id, old.rows[0].status, parsed.data.status, request.user.id, parsed.data.comment || null]);
    await client.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'expense.status',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ expenseId: id, status: parsed.data.status })]);
    const recipientId = Number(old.rows[0].requested_by || old.rows[0].created_by || 0);
    if (recipientId && recipientId !== Number(request.user.id) && old.rows[0].status !== parsed.data.status) {
      await client.query(`INSERT INTO notifications(user_id,notification_type,title,message,link_page,link_entity_id,dedupe_key)
        SELECT $1,'expense_status','Xarajat holati yangilandi',$2,'expenses',$3,$4
        WHERE COALESCE((SELECT (preferences->>'expenseNotifications')::boolean FROM user_preferences WHERE user_id=$1),TRUE)=TRUE
        ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
        [recipientId, `${old.rows[0].title}: ${parsed.data.status}`, id, `expense-${id}-${parsed.data.status}`]);
    }
    await client.query('COMMIT');
    const result = await pool.query(`${expenseSelect} WHERE e.id=$1`, [id]);
    const item = mapExpense(result.rows[0]);
    const recipients = recipientId && recipientId !== Number(request.user.id) ? [recipientId] : [];
    publishRealtime('expense.status', { expenseId: id, title: item.title, status: item.status, message: `${item.title}: ${item.status}` }, recipients.length ? recipients : null);
    if (recipients.length) void sendPushToUsers(recipients, { title: 'Xarajat statusi yangilandi', body: `${item.title}: ${item.status}`, icon: '/favicon-192.png', badge: '/favicon-32.png', url: `/xarajatlar?entityId=${id}`, tag: `expense-${id}` });
    response.json({ item });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
});

router.delete('/:id', permissionRequired('expenses.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('DELETE FROM expenses WHERE id=$1 RETURNING id,title,amount', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Xarajat topilmadi.' });
    await pool.query(`INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'expense.delete',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ expenseId: id, title: rows[0].title, amount: Number(rows[0].amount) })]);
    publishRealtime('expense.deleted', { expenseId: id, title: rows[0].title });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
