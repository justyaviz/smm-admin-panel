import React, { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, ClipboardList, Camera, Image, Network, Megaphone, BarChart3,
  Gift, FolderKanban, Building2, Users, Settings, Search, Plus, Trash2, Save,
  LogOut, Phone, Lock, Link2, CheckCircle2, AlertCircle
} from 'lucide-react'
import { api } from './api'

const ADMIN_PHONE = '998939000'
const ADMIN_PASSWORD = '12345678'

const MENU = [
  { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard },
  { id: 'content', title: 'Kontent reja', icon: ClipboardList },
  { id: 'shooting', title: 'Syomka', icon: Camera },
  { id: 'design', title: 'Dizayn markazi', icon: Image },
  { id: 'social', title: 'Ijtimoiy tarmoqlar', icon: Network },
  { id: 'ads', title: 'Reklama kampaniyalari', icon: Megaphone },
  { id: 'reports', title: 'Hisobotlar', icon: BarChart3 },
  { id: 'bonus', title: 'Bonus tizimi', icon: Gift },
  { id: 'tasks', title: 'Vazifalar', icon: FolderKanban },
  { id: 'branches', title: 'Filiallar', icon: Building2 },
  { id: 'team', title: 'Jamoa', icon: Users },
  { id: 'media', title: 'Media kutubxona', icon: Image },
  { id: 'settings', title: 'Sozlamalar', icon: Settings },
]

const SCHEMAS = {
  content: { title: 'Kontent reja', fields: ['title', 'platform', 'publish_date', 'status', 'note'], labels: ['Sarlavha', 'Platforma', 'Sana', 'Holat', 'Izoh'] },
  shooting: { title: 'Syomka', fields: ['project_name', 'location', 'shoot_date', 'owner', 'status'], labels: ['Loyiha', 'Lokatsiya', 'Sana', 'Masʼul', 'Holat'] },
  design: { title: 'Dizayn markazi', fields: ['name', 'design_type', 'owner', 'deadline', 'status'], labels: ['Nomi', 'Turi', 'Masʼul', 'Deadline', 'Holat'] },
  social: { title: 'Ijtimoiy tarmoqlar', fields: ['platform', 'url', 'login_name', 'status', 'note'], labels: ['Platforma', 'Link', 'Login', 'Holat', 'Izoh'] },
  ads: { title: 'Reklama kampaniyalari', fields: ['campaign_name', 'budget', 'start_date', 'end_date', 'result'], labels: ['Kampaniya', 'Byudjet', 'Boshlanish', 'Tugash', 'Natija'] },
  reports: { title: 'Hisobotlar', fields: ['period_name', 'owner', 'reach_count', 'lead_count', 'note'], labels: ['Davr', 'Masʼul', 'Qamrov', 'Lead', 'Izoh'] },
  bonus: { title: 'Bonus tizimi', fields: ['employee_name', 'position', 'score', 'bonus_amount', 'note'], labels: ['Xodim', 'Lavozim', 'Ball', 'Bonus', 'Izoh'] },
  tasks: { title: 'Vazifalar', fields: ['task_name', 'assignee', 'deadline', 'status', 'note'], labels: ['Vazifa', 'Masʼul', 'Deadline', 'Status', 'Izoh'] },
  branches: { title: 'Filiallar', fields: ['branch_name', 'city', 'manager', 'phone', 'note'], labels: ['Filial', 'Shahar', 'Manager', 'Telefon', 'Izoh'] },
  media: { title: 'Media kutubxona', fields: ['name', 'category', 'file_size', 'url', 'note'], labels: ['Nomi', 'Kategoriya', 'Hajm', 'Link', 'Izoh'] },
}

function Badge({ children, color = 'blue' }) { return <span className={`badge ${color}`}>{children}</span> }

function LoginPage({ onSuccess }) {
  const [phone, setPhone] = useState(ADMIN_PHONE)
  const [password, setPassword] = useState(ADMIN_PASSWORD)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api.login(phone, password)
      localStorage.setItem('aloo_token', data.token)
      localStorage.setItem('aloo_user', JSON.stringify(data.user))
      onSuccess(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-row"><div className="logo">a</div><div><h1>aloo SMM Admin</h1><p>Final ishchi tizim</p></div></div>
        <div className="note ok"><CheckCircle2 size={16} /> Test login: {ADMIN_PHONE} / {ADMIN_PASSWORD}</div>
        <label className="field"><span>Telefon raqam</span><div className="input-row"><Phone size={16} /><input value={phone} onChange={(e)=>setPhone(e.target.value)} /></div></label>
        <label className="field"><span>Parol</span><div className="input-row"><Lock size={16} /><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} /></div></label>
        {error && <div className="note err"><AlertCircle size={16} /> {error}</div>}
        <button className="btn blue full" type="submit">{loading ? 'Kirilmoqda...' : 'Panelga kirish'}</button>
      </form>
    </div>
  )
}

function SectionTable({ section, rows, refresh }) {
  const schema = SCHEMAS[section]
  const empty = Object.fromEntries(schema.fields.map((k) => [k, '']))
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(empty) }, [section])

  const createRow = async () => {
    setSaving(true)
    try {
      await api.create(section, form)
      setForm(empty)
      await refresh()
    } finally { setSaving(false) }
  }

  const updateCell = async (id, key, value, row) => {
    await api.update(section, id, { ...row, [key]: value })
    await refresh()
  }

  const removeRow = async (id) => {
    await api.remove(section, id)
    await refresh()
  }

  return (
    <div className="stack-gap">
      <div className="card">
        <div className="section-head"><div><h3>{schema.title}</h3><p>Yangi qator qo‘shish va tahrirlash ishlaydi</p></div><Badge color="green">Jami: {rows.length}</Badge></div>
        <div className="grid-5">
          {schema.fields.map((f, i) => (
            <label key={f} className="field"><span>{schema.labels[i]}</span><input value={form[f]} onChange={(e)=>setForm({ ...form, [f]: e.target.value })} /></label>
          ))}
        </div>
        <div className="toolbar left"><button className="btn blue" onClick={createRow} disabled={saving}><Plus size={16} /> {saving ? 'Saqlanmoqda...' : 'Yangi qator'}</button></div>
      </div>
      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead><tr>{schema.labels.map((l)=><th key={l}>{l}</th>)}<th>Amal</th></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={schema.labels.length + 1} className="empty-cell">Maʼlumot yo‘q</td></tr> : rows.map((row)=> (
                <tr key={row.id}>
                  {schema.fields.map((f)=> (
                    <td key={f}><input defaultValue={row[f] ?? ''} onBlur={(e)=>updateCell(row.id, f, e.target.value, row)} /></td>
                  ))}
                  <td><button className="icon-btn red" onClick={()=>removeRow(row.id)}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TeamPage({ rows, refresh }) {
  const [form, setForm] = useState({ name: '', role: '', phone: '', login: '', password: '' })
  const createUser = async () => { await api.create('team', form); setForm({ name:'', role:'', phone:'', login:'', password:'' }); await refresh() }
  const updateCell = async (id, key, value, row) => { await api.update('team', id, { ...row, [key]: value }); await refresh() }
  const removeRow = async (id) => { await api.remove('team', id); await refresh() }

  return (
    <div className="stack-gap">
      <div className="card">
        <div className="section-head"><div><h3>Hodim yaratish</h3><p>Login va parol berish mumkin</p></div></div>
        <div className="grid-5">
          {['name','role','phone','login','password'].map((f, i) => (
            <label className="field" key={f}><span>{['Ism','Lavozim','Telefon','Login','Parol'][i]}</span><input value={form[f]} onChange={(e)=>setForm({ ...form, [f]: e.target.value })} /></label>
          ))}
        </div>
        <div className="toolbar left"><button className="btn green" onClick={createUser}><Plus size={16} /> Hodim qo‘shish</button></div>
      </div>
      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ism</th><th>Lavozim</th><th>Telefon</th><th>Login</th><th>Parol</th><th>Amal</th></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={6} className="empty-cell">Hodim yo‘q</td></tr> : rows.map((row)=> (
                <tr key={row.id}>
                  {['name','role','phone','login','password'].map((f)=><td key={f}><input defaultValue={row[f] ?? ''} onBlur={(e)=>updateCell(row.id, f, e.target.value, row)} /></td>)}
                  <td><button className="icon-btn red" onClick={()=>removeRow(row.id)}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SettingsPage({ settings, refresh }) {
  const [form, setForm] = useState(settings)
  useEffect(() => { setForm(settings) }, [settings])
  const save = async () => { await api.saveSettings(form); await refresh() }

  return (
    <div className="stack-gap">
      <div className="card">
        <div className="section-head"><div><h3>Kompaniya sozlamalari</h3><p>Ijtimoiy tarmoqlarni ulash mumkin</p></div><button className="btn blue" onClick={save}><Save size={16} /> Saqlash</button></div>
        <div className="grid-3">
          {[
            ['company_name','Kompaniya nomi'],['department','Bo‘lim'],['website','Website'],['telegram','Telegram'],['instagram','Instagram'],['youtube','YouTube'],['facebook','Facebook'],['tiktok','TikTok']
          ].map(([f,l]) => <label className="field" key={f}><span>{l}</span><input value={form?.[f] ?? ''} onChange={(e)=>setForm({ ...form, [f]: e.target.value })} /></label>)}
        </div>
      </div>
      <div className="card">
        <div className="section-head"><div><h3>Ulangan tarmoqlar</h3></div></div>
        <div className="social-list">
          {['telegram','instagram','youtube','facebook','tiktok'].map((k)=> (
            <div className="social-item" key={k}><div><strong>{k}</strong><p>{form?.[k] || 'Ulanmagan'}</p></div>{form?.[k] ? <a className="btn sky" href={form[k]} target="_blank" rel="noreferrer"><Link2 size={14} /> Ochish</a> : <Badge color="red">Ulanmagan</Badge>}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Dashboard({ stats }) {
  const cards = [
    ['Kontentlar', stats.content_count || 0, 'blue'],
    ['Vazifalar', stats.tasks_count || 0, 'green'],
    ['Kampaniyalar', stats.ads_count || 0, 'sky'],
    ['Hodimlar', stats.team_count || 0, 'red'],
  ]
  return (
    <div className="stack-gap">
      <div className="cards4">{cards.map(([t,v,c]) => <div className="stat-card" key={t}><div className="stat-topline">{t}</div><div className="stat-number">{v}</div><Badge color={c}>0 dan boshlandi</Badge></div>)}</div>
      <div className="split-grid">
        <div className="card"><div className="section-head"><div><h3>Bugungi holat</h3><p>Panel API va database bilan ishlaydi</p></div></div><div className="status-list"><div className="status-item"><CheckCircle2 size={18}/> Login tayyor</div><div className="status-item"><CheckCircle2 size={18}/> CRUD ishlaydi</div><div className="status-item"><CheckCircle2 size={18}/> Hodim yaratish ishlaydi</div><div className="status-item"><CheckCircle2 size={18}/> Sozlamalar saqlanadi</div></div></div>
        <div className="card"><div className="section-head"><div><h3>API</h3><p>Backend manzili</p></div></div><div className="note-box"><AlertCircle size={18}/><p>{api.base}</p></div></div>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [active, setActive] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({})
  const [data, setData] = useState({ team: [], settings: {} })
  const [loading, setLoading] = useState(false)

  const filteredMenu = useMemo(() => MENU.filter((m) => m.title.toLowerCase().includes(search.toLowerCase())), [search])

  const refresh = async () => {
    setLoading(true)
    try {
      const [statsData, settingsData, ...lists] = await Promise.all([
        api.stats(),
        api.getSettings(),
        ...Object.keys(SCHEMAS).map((s) => api.list(s)),
        api.list('team'),
      ])
      const next = { settings: settingsData, team: lists[lists.length - 1] }
      Object.keys(SCHEMAS).forEach((k, i) => { next[k] = lists[i] })
      setStats(statsData)
      setData(next)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const token = localStorage.getItem('aloo_token')
    const u = localStorage.getItem('aloo_user')
    if (token && u) setUser(JSON.parse(u))
  }, [])

  useEffect(() => { if (user) refresh() }, [user])

  const logout = () => { localStorage.removeItem('aloo_token'); localStorage.removeItem('aloo_user'); setUser(null) }
  if (!user) return <LoginPage onSuccess={setUser} />

  let content = null
  if (active === 'dashboard') content = <Dashboard stats={stats} />
  else if (SCHEMAS[active]) content = <SectionTable section={active} rows={data[active] || []} refresh={refresh} />
  else if (active === 'team') content = <TeamPage rows={data.team || []} refresh={refresh} />
  else if (active === 'settings') content = <SettingsPage settings={data.settings || {}} refresh={refresh} />

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-top"><div className="logo small">a</div><div><h2>{data.settings?.company_name || 'aloo'}</h2><p>{data.settings?.department || 'SMM department'}</p></div></div>
        <div className="search-box"><Search size={16} /><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Menu qidirish" /></div>
        <div className="menu-list">{filteredMenu.map((item)=>{ const Icon = item.icon; return <button key={item.id} className={`menu-btn ${active===item.id ? 'active' : ''}`} onClick={()=>setActive(item.id)}><span><Icon size={16} /> {item.title}</span></button>})}</div>
        <div className="sidebar-bottom"><button className="btn red full" onClick={logout}><LogOut size={16} /> Chiqish</button></div>
      </aside>
      <main className="main">
        <div className="topbar"><div><h1>{MENU.find((m)=>m.id===active)?.title || 'Dashboard'}</h1><p>{loading ? 'Yuklanmoqda...' : 'Database bilan ishlayapti'}</p></div><div className="top-actions"><Badge color="blue">{user.name || 'Admin'}</Badge><Badge color="green">Online</Badge></div></div>
        {content}
      </main>
    </div>
  )
}
