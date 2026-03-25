import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';
import { requireAuth, requireRoles } from './middleware/auth.js';
import { sendPdfTable, sendXlsx } from './utils/export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
app.use(cors({
  origin: [
    "https://smm-admin-panel-fron-production.up.railway.app",
    "http://localhost:5173"
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const upload = multer({ storage });

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, full_name: user.full_name }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function logAction(userId, action_type, entity_type, entity_id = null, meta = {}) {
  await query(
    'INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, meta) VALUES ($1,$2,$3,$4,$5)',
    [userId || null, action_type, entity_type, entity_id, JSON.stringify(meta)]
  );
}

async function ensureDefaults() {
  const adminPhone = '998939000';
  const adminPassword = '12345678';
  const existing = await query('SELECT id FROM users WHERE phone = $1', [adminPhone]);
  if (!existing.rowCount) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await query(
      'INSERT INTO users (full_name, phone, login, password_hash, role) VALUES ($1,$2,$3,$4,$5)',
      ['Yaviz Admin', adminPhone, 'admin', hash, 'admin']
    );
  }
  const settings = await query('SELECT id FROM app_settings LIMIT 1');
  if (!settings.rowCount) {
    await query('INSERT INTO app_settings (company_name, department_name, theme_default) VALUES ($1,$2,$3)', ['aloo', 'SMM department', 'dark']);
  }
}

app.get('/api/health', async (_, res) => {
  const db = await query('SELECT NOW()');
  res.json({ ok: true, dbTime: db.rows[0].now });
});

app.post('/api/auth/login', async (req, res) => {
  const { phoneOrLogin, password } = req.body;
  const result = await query('SELECT * FROM users WHERE phone = $1 OR login = $1 LIMIT 1', [phoneOrLogin]);
  const user = result.rows[0];
  if (!user || !user.is_active) return res.status(401).json({ message: 'Login yoki parol xato' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'Login yoki parol xato' });
  const token = signToken(user);
  await logAction(user.id, 'login', 'auth', user.id, { phoneOrLogin });
  res.json({ token, user: { id: user.id, full_name: user.full_name, role: user.role, phone: user.phone, login: user.login } });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const r = await query('SELECT id, full_name, role, phone, login, is_active FROM users WHERE id = $1', [req.user.id]);
  res.json(r.rows[0]);
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const r = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = r.rows[0];
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(400).json({ message: 'Joriy parol noto‘g‘ri' });
  const hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
  await logAction(req.user.id, 'change_password', 'user', req.user.id);
  res.json({ success: true });
});

function listRoute(table, orderBy = 'id DESC') {
  return async (req, res) => {
    const r = await query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
    res.json(r.rows);
  };
}

// users/team
app.get('/api/team', requireAuth, requireRoles('admin', 'manager'), listRoute('users'));
app.post('/api/team', requireAuth, requireRoles('admin'), async (req, res) => {
  const { full_name, phone, login, password, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const r = await query(
    'INSERT INTO users (full_name, phone, login, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, phone, login, role, is_active',
    [full_name, phone, login || null, hash, role || 'viewer']
  );
  await logAction(req.user.id, 'create', 'user', r.rows[0].id, r.rows[0]);
  res.json(r.rows[0]);
});
app.put('/api/team/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const { full_name, phone, login, role, is_active } = req.body;
  const r = await query(
    'UPDATE users SET full_name=$1, phone=$2, login=$3, role=$4, is_active=$5, updated_at=NOW() WHERE id=$6 RETURNING id, full_name, phone, login, role, is_active',
    [full_name, phone, login || null, role, is_active, req.params.id]
  );
  await logAction(req.user.id, 'update', 'user', Number(req.params.id), r.rows[0]);
  res.json(r.rows[0]);
});
app.delete('/api/team/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  await query('DELETE FROM users WHERE id = $1', [req.params.id]);
  await logAction(req.user.id, 'delete', 'user', Number(req.params.id));
  res.json({ success: true });
});

// settings
app.get('/api/settings', requireAuth, async (_, res) => {
  const r = await query('SELECT * FROM app_settings LIMIT 1');
  res.json(r.rows[0]);
});
app.put('/api/settings', requireAuth, requireRoles('admin', 'manager'), async (req, res) => {
  const { company_name, department_name, theme_default, telegram_url, instagram_url, youtube_url, facebook_url, tiktok_url, website_url } = req.body;
  const r = await query(
    `UPDATE app_settings SET company_name=$1, department_name=$2, theme_default=$3, telegram_url=$4, instagram_url=$5, youtube_url=$6, facebook_url=$7, tiktok_url=$8, website_url=$9, updated_at=NOW() WHERE id=(SELECT id FROM app_settings LIMIT 1) RETURNING *`,
    [company_name, department_name, theme_default, telegram_url, instagram_url, youtube_url, facebook_url, tiktok_url, website_url]
  );
  await logAction(req.user.id, 'update', 'settings', 1);
  res.json(r.rows[0]);
});

// generic CRUD helpers
async function createContentLike(res, req, table, fields) {
  const values = fields.map((f) => req.body[f] ?? null);
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(',');
  const cols = fields.join(',');
  const r = await query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`, values);
  await logAction(req.user.id, 'create', table, r.rows[0].id, r.rows[0]);
  res.json(r.rows[0]);
}
async function updateContentLike(res, req, table, fields) {
  const set = fields.map((f, i) => `${f}=$${i + 1}`).join(',');
  const values = fields.map((f) => req.body[f] ?? null);
  values.push(req.params.id);
  const r = await query(`UPDATE ${table} SET ${set}${table === 'content_items' || table === 'tasks' ? ', updated_at=NOW()' : ''} WHERE id=$${fields.length + 1} RETURNING *`, values);
  await logAction(req.user.id, 'update', table, Number(req.params.id), r.rows[0]);
  res.json(r.rows[0]);
}
function deleteRoute(table) {
  return async (req, res) => {
    await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
    await logAction(req.user.id, 'delete', table, Number(req.params.id));
    res.json({ success: true });
  };
}

// content
app.get('/api/content', requireAuth, listRoute('content_items', 'publish_date DESC NULLS LAST, id DESC'));
app.post('/api/content', requireAuth, requireRoles('admin', 'manager', 'editor'), async (req, res) => createContentLike(res, req, 'content_items', ['title','platform','content_type','status','publish_date','assignee_user_id','branch_id','notes','created_by']));
app.put('/api/content/:id', requireAuth, requireRoles('admin', 'manager', 'editor'), async (req, res) => updateContentLike(res, req, 'content_items', ['title','platform','content_type','status','publish_date','assignee_user_id','branch_id','notes','created_by']));
app.delete('/api/content/:id', requireAuth, requireRoles('admin', 'manager'), deleteRoute('content_items'));
app.get('/api/content/export/excel', requireAuth, async (_, res) => {
  const r = await query('SELECT * FROM content_items ORDER BY id DESC');
  sendXlsx(res, r.rows, 'content.xlsx', 'Content');
});
app.get('/api/content/export/pdf', requireAuth, async (_, res) => {
  const r = await query('SELECT * FROM content_items ORDER BY id DESC');
  sendPdfTable(res, r.rows, 'Content export', 'content.pdf');
});

// tasks
app.get('/api/tasks', requireAuth, listRoute('tasks', 'due_date ASC NULLS LAST, id DESC'));
app.post('/api/tasks', requireAuth, requireRoles('admin','manager','editor'), async (req, res) => createContentLike(res, req, 'tasks', ['title','description','status','priority','due_date','assignee_user_id','created_by']));
app.put('/api/tasks/:id', requireAuth, requireRoles('admin','manager','editor'), async (req, res) => updateContentLike(res, req, 'tasks', ['title','description','status','priority','due_date','assignee_user_id','created_by']));
app.delete('/api/tasks/:id', requireAuth, requireRoles('admin','manager'), deleteRoute('tasks'));

// reports
app.get('/api/reports', requireAuth, listRoute('reports', 'period_end DESC, id DESC'));
app.post('/api/reports', requireAuth, requireRoles('admin','manager'), async (req, res) => createContentLike(res, req, 'reports', ['title','period_start','period_end','reach_count','lead_count','sales_count','spend_amount','revenue_amount','notes','created_by']));
app.put('/api/reports/:id', requireAuth, requireRoles('admin','manager'), async (req, res) => updateContentLike(res, req, 'reports', ['title','period_start','period_end','reach_count','lead_count','sales_count','spend_amount','revenue_amount','notes','created_by']));
app.delete('/api/reports/:id', requireAuth, requireRoles('admin'), deleteRoute('reports'));
app.get('/api/reports/export/excel', requireAuth, async (_, res) => {
  const r = await query('SELECT * FROM reports ORDER BY id DESC');
  sendXlsx(res, r.rows, 'reports.xlsx', 'Reports');
});
app.get('/api/reports/export/pdf', requireAuth, async (_, res) => {
  const r = await query('SELECT * FROM reports ORDER BY id DESC');
  sendPdfTable(res, r.rows, 'Reports export', 'reports.pdf');
});

// bonuses
app.get('/api/bonus', requireAuth, async (_, res) => {
  const r = await query(`SELECT b.*, u.full_name, u.role FROM bonuses b JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC`);
  res.json(r.rows);
});
app.post('/api/bonus/recalculate', requireAuth, requireRoles('admin','manager'), async (req, res) => {
  const { month_label, pool_amount = 0 } = req.body;
  const users = await query('SELECT id, full_name, role FROM users WHERE is_active = TRUE');
  const contents = await query('SELECT created_by, COUNT(*) total, COUNT(*) FILTER (WHERE status = $1) done FROM content_items GROUP BY created_by', ['posted']);
  const tasks = await query('SELECT assignee_user_id, COUNT(*) total, COUNT(*) FILTER (WHERE status = $1) done FROM tasks GROUP BY assignee_user_id', ['done']);
  const reports = await query('SELECT created_by, COUNT(*) total FROM reports GROUP BY created_by');

  const byContent = Object.fromEntries(contents.rows.map(r => [r.created_by, r]));
  const byTasks = Object.fromEntries(tasks.rows.map(r => [r.assignee_user_id, r]));
  const byReports = Object.fromEntries(reports.rows.map(r => [r.created_by, r]));
  const activeCount = users.rows.length || 1;
  const baseBonus = Number(pool_amount) / activeCount;

  await query('DELETE FROM bonuses WHERE month_label = $1', [month_label]);
  const created = [];
  for (const user of users.rows) {
    const c = byContent[user.id] || { total: 0, done: 0 };
    const t = byTasks[user.id] || { total: 0, done: 0 };
    const r = byReports[user.id] || { total: 0 };
    const contentScore = c.total ? (Number(c.done) / Number(c.total)) * 100 : 0;
    const taskScore = t.total ? (Number(t.done) / Number(t.total)) * 100 : 0;
    const reportScore = r.total ? Math.min(Number(r.total) * 20, 100) : 0;
    const total = contentScore * 0.4 + taskScore * 0.35 + reportScore * 0.25;
    const amount = Math.round(baseBonus * (total / 100));
    const ins = await query(
      'INSERT INTO bonuses (user_id, month_label, kpi_score, task_score, report_score, total_score, bonus_amount, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [user.id, month_label, Number(contentScore.toFixed(2)), Number(taskScore.toFixed(2)), Number(reportScore.toFixed(2)), Number(total.toFixed(2)), amount, 'Auto-calculated']
    );
    created.push(ins.rows[0]);
  }
  await logAction(req.user.id, 'recalculate', 'bonuses', null, { month_label, pool_amount, count: created.length });
  res.json(created);
});
app.get('/api/bonus/export/excel', requireAuth, async (_, res) => {
  const r = await query(`SELECT b.*, u.full_name, u.role FROM bonuses b JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC`);
  sendXlsx(res, r.rows, 'bonus.xlsx', 'Bonus');
});

// branches
app.get('/api/branches', requireAuth, listRoute('branches'));
app.post('/api/branches', requireAuth, requireRoles('admin','manager'), async (req, res) => createContentLike(res, req, 'branches', ['name','city','manager_name','phone','notes']));
app.put('/api/branches/:id', requireAuth, requireRoles('admin','manager'), async (req, res) => updateContentLike(res, req, 'branches', ['name','city','manager_name','phone','notes']));
app.delete('/api/branches/:id', requireAuth, requireRoles('admin'), deleteRoute('branches'));

// social
app.get('/api/social', requireAuth, listRoute('social_accounts'));
app.post('/api/social', requireAuth, requireRoles('admin','manager','editor'), async (req, res) => createContentLike(res, req, 'social_accounts', ['platform','account_name','account_url','login_name','status','notes']));
app.put('/api/social/:id', requireAuth, requireRoles('admin','manager','editor'), async (req, res) => updateContentLike(res, req, 'social_accounts', ['platform','account_name','account_url','login_name','status','notes']));
app.delete('/api/social/:id', requireAuth, requireRoles('admin','manager'), deleteRoute('social_accounts'));

// uploads
app.get('/api/uploads', requireAuth, listRoute('uploads'));
app.post('/api/uploads', requireAuth, upload.single('file'), async (req, res) => {
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  const r = await query(
    'INSERT INTO uploads (file_name, original_name, mime_type, file_size, file_url, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, fileUrl, req.user.id]
  );
  await logAction(req.user.id, 'upload', 'file', r.rows[0].id, r.rows[0]);
  res.json(r.rows[0]);
});
app.delete('/api/uploads/:id', requireAuth, async (req, res) => {
  const r = await query('SELECT * FROM uploads WHERE id = $1', [req.params.id]);
  const row = r.rows[0];
  if (row) {
    const filePath = path.join(uploadsDir, row.file_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await query('DELETE FROM uploads WHERE id = $1', [req.params.id]);
  }
  await logAction(req.user.id, 'delete', 'upload', Number(req.params.id));
  res.json({ success: true });
});

// audit logs and dashboard
app.get('/api/audit-logs', requireAuth, requireRoles('admin','manager'), async (_, res) => {
  const r = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
  res.json(r.rows);
});
app.get('/api/dashboard/summary', requireAuth, async (_, res) => {
  const [content, tasks, reports, users, bonuses] = await Promise.all([
    query('SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status = $1)::int AS posted FROM content_items', ['posted']),
    query('SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status = $1)::int AS done FROM tasks', ['done']),
    query('SELECT COUNT(*)::int AS count, COALESCE(SUM(lead_count),0)::int AS leads FROM reports'),
    query('SELECT COUNT(*)::int AS count FROM users WHERE is_active = TRUE'),
    query('SELECT COALESCE(SUM(bonus_amount),0)::float AS total FROM bonuses')
  ]);
  res.json({
    content: content.rows[0],
    tasks: tasks.rows[0],
    reports: reports.rows[0],
    users: users.rows[0],
    bonuses: bonuses.rows[0]
  });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error', detail: err.message });
});

const port = process.env.PORT || 8080;
ensureDefaults().then(() => {
  app.listen(port, () => console.log(`API running on ${port}`));
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
