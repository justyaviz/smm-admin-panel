import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pkg from 'pg'

dotenv.config()
const { Pool } = pkg
const app = express()
const PORT = process.env.PORT || 8080
const JWT_SECRET = process.env.JWT_SECRET || 'change_me'
const CLIENT_URL = process.env.CLIENT_URL || '*'

app.use(cors({ origin: CLIENT_URL === '*' ? true : CLIENT_URL, credentials: true }))
app.use(express.json())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const sectionMap = {
  content: { table: 'content', fields: ['title', 'platform', 'publish_date', 'status', 'note'] },
  shooting: { table: 'shooting', fields: ['project_name', 'location', 'shoot_date', 'owner', 'status'] },
  design: { table: 'design', fields: ['name', 'design_type', 'owner', 'deadline', 'status'] },
  social: { table: 'social', fields: ['platform', 'url', 'login_name', 'status', 'note'] },
  ads: { table: 'ads', fields: ['campaign_name', 'budget', 'start_date', 'end_date', 'result'] },
  reports: { table: 'reports', fields: ['period_name', 'owner', 'reach_count', 'lead_count', 'note'] },
  bonus: { table: 'bonus', fields: ['employee_name', 'position', 'score', 'bonus_amount', 'note'] },
  tasks: { table: 'tasks', fields: ['task_name', 'assignee', 'deadline', 'status', 'note'] },
  branches: { table: 'branches', fields: ['branch_name', 'city', 'manager', 'phone', 'note'] },
  team: { table: 'team', fields: ['name', 'role', 'phone', 'login', 'password'] },
  media: { table: 'media', fields: ['name', 'category', 'file_size', 'url', 'note'] },
}

async function ensureAdmin() {
  const phone = process.env.ADMIN_PHONE || '998939000'
  const password = process.env.ADMIN_PASSWORD || '12345678'
  const name = 'Admin'
  const login = 'admin'
  const role = 'admin'
  const existing = await pool.query('SELECT id FROM users WHERE phone = $1 LIMIT 1', [phone])
  if (existing.rowCount > 0) return
  const hash = await bcrypt.hash(password, 10)
  await pool.query(
    'INSERT INTO users (name, phone, login, password_hash, role) VALUES ($1,$2,$3,$4,$5)',
    [name, phone, login, hash, role]
  )
}

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Token yo‘q' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Token xato yoki eskirgan' })
  }
}

app.get('/api/health', async (_req, res) => {
  const now = await pool.query('SELECT NOW()')
  res.json({ ok: true, time: now.rows[0].now })
})

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body
  const result = await pool.query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [phone])
  if (result.rowCount === 0) return res.status(401).json({ message: 'Telefon yoki parol noto‘g‘ri' })
  const user = result.rows[0]
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ message: 'Telefon yoki parol noto‘g‘ri' })
  const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } })
})

app.get('/api/auth/me', auth, async (req, res) => {
  const result = await pool.query('SELECT id, name, phone, role FROM users WHERE id = $1', [req.user.id])
  res.json(result.rows[0])
})

app.get('/api/dashboard/stats', auth, async (_req, res) => {
  const queries = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM content'),
    pool.query('SELECT COUNT(*)::int AS count FROM tasks'),
    pool.query('SELECT COUNT(*)::int AS count FROM ads'),
    pool.query('SELECT COUNT(*)::int AS count FROM team'),
  ])
  res.json({
    content_count: queries[0].rows[0].count,
    tasks_count: queries[1].rows[0].count,
    ads_count: queries[2].rows[0].count,
    team_count: queries[3].rows[0].count,
  })
})

app.get('/api/settings', auth, async (_req, res) => {
  const result = await pool.query('SELECT * FROM settings WHERE id = 1 LIMIT 1')
  if (result.rowCount === 0) {
    return res.json({ id: 1, company_name: 'aloo', department: 'SMM department', website: '', telegram: '', instagram: '', youtube: '', facebook: '', tiktok: '' })
  }
  res.json(result.rows[0])
})

app.put('/api/settings', auth, async (req, res) => {
  const s = req.body
  await pool.query(
    `INSERT INTO settings (id, company_name, department, website, telegram, instagram, youtube, facebook, tiktok)
     VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       department = EXCLUDED.department,
       website = EXCLUDED.website,
       telegram = EXCLUDED.telegram,
       instagram = EXCLUDED.instagram,
       youtube = EXCLUDED.youtube,
       facebook = EXCLUDED.facebook,
       tiktok = EXCLUDED.tiktok,
       updated_at = NOW()`,
    [s.company_name || 'aloo', s.department || 'SMM department', s.website || '', s.telegram || '', s.instagram || '', s.youtube || '', s.facebook || '', s.tiktok || '']
  )
  res.json({ success: true })
})

for (const [route, cfg] of Object.entries(sectionMap)) {
  app.get(`/api/${route}`, auth, async (_req, res) => {
    const result = await pool.query(`SELECT * FROM ${cfg.table} ORDER BY id DESC`)
    res.json(result.rows)
  })

  app.post(`/api/${route}`, auth, async (req, res) => {
    const values = cfg.fields.map((f) => req.body[f] ?? '')
    const cols = cfg.fields.join(', ')
    const params = cfg.fields.map((_, i) => `$${i + 1}`).join(', ')
    const result = await pool.query(`INSERT INTO ${cfg.table} (${cols}) VALUES (${params}) RETURNING *`, values)
    res.json(result.rows[0])
  })

  app.put(`/api/${route}/:id`, auth, async (req, res) => {
    const values = cfg.fields.map((f) => req.body[f] ?? '')
    const sets = cfg.fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
    values.push(req.params.id)
    const result = await pool.query(`UPDATE ${cfg.table} SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`, values)
    res.json(result.rows[0])
  })

  app.delete(`/api/${route}/:id`, auth, async (req, res) => {
    await pool.query(`DELETE FROM ${cfg.table} WHERE id = $1`, [req.params.id])
    res.status(204).end()
  })
}

async function start() {
  await ensureAdmin()
  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`)
  })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
