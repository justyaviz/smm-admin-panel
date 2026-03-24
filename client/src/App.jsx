import React, { useEffect, useMemo, useState } from 'react';
import { api, API_BASE } from './api';
import {
  Bell, Building2, CalendarDays, CheckCircle2, ClipboardList, Download, Gift,
  Image, LayoutDashboard, LogOut, Megaphone, Menu, Moon, Network, Plus,
  Search, Settings, SunMedium, Target, Trash2, Upload, Users, FileText, Camera, FolderKanban
} from 'lucide-react';

const ENTITY_CONFIG = {
  content: {
    title: 'Kontent reja', icon: ClipboardList,
    columns: [
      ['title', 'Sarlavha'], ['platform', 'Platforma'], ['content_type', 'Turi'], ['status', 'Holat'], ['publish_date', 'Sana'], ['notes', 'Izoh']
    ],
    blank: { title: '', platform: 'Instagram', content_type: 'reel', status: 'draft', publish_date: '', notes: '' }
  },
  tasks: {
    title: 'Vazifalar', icon: FolderKanban,
    columns: [
      ['title', 'Vazifa'], ['description', 'Tavsif'], ['status', 'Holat'], ['priority', 'Priority'], ['due_date', 'Deadline']
    ],
    blank: { title: '', description: '', status: 'todo', priority: 'medium', due_date: '' }
  },
  reports: {
    title: 'Hisobotlar', icon: FileText,
    columns: [
      ['title', 'Nomi'], ['period_start', 'Boshlanish'], ['period_end', 'Tugash'], ['reach_count', 'Qamrov'], ['lead_count', 'Lead'], ['sales_count', 'Sotuv'], ['spend_amount', 'Spend'], ['revenue_amount', 'Revenue'], ['notes', 'Izoh']
    ],
    blank: { title: '', period_start: '', period_end: '', reach_count: 0, lead_count: 0, sales_count: 0, spend_amount: 0, revenue_amount: 0, notes: '' }
  },
  branches: {
    title: 'Filiallar', icon: Building2,
    columns: [['name', 'Filial'], ['city', 'Shahar'], ['manager_name', 'Manager'], ['phone', 'Telefon'], ['notes', 'Izoh']],
    blank: { name: '', city: '', manager_name: '', phone: '', notes: '' }
  },
  social: {
    title: 'Ijtimoiy tarmoqlar', icon: Network,
    columns: [['platform', 'Platforma'], ['account_name', 'Account'], ['account_url', 'Link'], ['login_name', 'Login'], ['status', 'Status'], ['notes', 'Izoh']],
    blank: { platform: 'Telegram', account_name: '', account_url: '', login_name: '', status: 'active', notes: '' }
  },
  team: {
    title: 'Jamoa', icon: Users,
    columns: [['full_name', 'Ism'], ['phone', 'Telefon'], ['login', 'Login'], ['role', 'Role'], ['is_active', 'Aktiv']],
    blank: { full_name: '', phone: '', login: '', password: '', role: 'viewer', is_active: true }
  },
  bonus: {
    title: 'Bonus tizimi', icon: Gift,
    columns: [['full_name', 'Xodim'], ['month_label', 'Oy'], ['kpi_score', 'KPI'], ['task_score', 'Task'], ['report_score', 'Report'], ['total_score', 'Jami'], ['bonus_amount', 'Bonus']],
    readonly: true,
    blank: {}
  },
  uploads: {
    title: 'Media kutubxona', icon: Image,
    columns: [['original_name', 'Nomi'], ['mime_type', 'Tip'], ['file_size', 'Hajm'], ['file_url', 'URL']],
    readonly: true,
    blank: {}
  }
};

const nav = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['content', 'Kontent reja', ClipboardList],
  ['tasks', 'Vazifalar', FolderKanban],
  ['reports', 'Hisobotlar', FileText],
  ['bonus', 'Bonus', Gift],
  ['branches', 'Filiallar', Building2],
  ['social', 'Ijtimoiy tarmoqlar', Network],
  ['team', 'Jamoa', Users],
  ['uploads', 'Media', Image],
  ['settings', 'Sozlamalar', Settings],
];

function Input({ value, onChange, type = 'text', placeholder = '' }) {
  return <input className="input" type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

function Login({ onLogin, theme, setTheme }) {
  const [phoneOrLogin, setPhoneOrLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const data = await api.login({ phoneOrLogin, password });
      localStorage.setItem('aloo_token', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-show">
        <div className="chip">ALOO SMM SYSTEM</div>
        <h1>Kuchli kirish oynasi bilan zamonaviy admin panel</h1>
        <p>SMM bo‘limi uchun yagona markaz: hisobot, reja, bonus, kontent nazorati va jamoa boshqaruvi.</p>
        <div className="hero-stats">
          <div className="hero-card"><div>Kontent bajarilishi</div><strong>86%</strong><div className="progress"><span style={{ width: '86%' }} /></div></div>
          <div className="hero-card"><div>Bugungi tasklar</div><strong>14</strong><small>6 tasi tayyor</small></div>
          <div className="hero-card"><div>Bonus fondi</div><strong>18.4M</strong><small>Mart bo‘yicha</small></div>
        </div>
      </div>
      <form className="login-box" onSubmit={submit} autoComplete="off">
        <div className="login-head">
          <div>
            <div className="muted">ADMIN LOGIN</div>
            <h2>Xush kelibsiz</h2>
          </div>
          <button type="button" className="theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <label>Telefon yoki login</label>
        <Input value={phoneOrLogin} onChange={setPhoneOrLogin} placeholder="998939000 yoki admin" />
        <label>Parol</label>
        <Input value={password} onChange={setPassword} type="password" placeholder="Parol" />
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={loading}>{loading ? 'Kirilmoqda...' : 'Tizimga kirish'}</button>
        <div className="hint">Demo: 998939000 / 12345678</div>
      </form>
    </div>
  );
}

function TopBar({ title, user, theme, setTheme, onLogout }) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        <p>Real backend, Postgres, export va role system bilan ishlaydi</p>
      </div>
      <div className="top-actions">
        <button className="icon-btn"><Bell size={16} /></button>
        <button className="theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />}
        </button>
        <div className="user-chip"><strong>{user?.full_name || 'User'}</strong><span>{user?.role}</span></div>
        <button className="btn ghost" onClick={onLogout}><LogOut size={16} /> Chiqish</button>
      </div>
    </div>
  );
}

function Dashboard({ summary }) {
  const cards = [
    ['Kontentlar', summary?.content?.count || 0],
    ['Posted', summary?.content?.posted || 0],
    ['Vazifalar', summary?.tasks?.count || 0],
    ['Bajarilgan', summary?.tasks?.done || 0],
    ['Leadlar', summary?.reports?.leads || 0],
    ['Hodimlar', summary?.users?.count || 0],
    ['Bonus jami', summary?.bonuses?.total || 0],
  ];
  return (
    <div className="stack">
      <div className="hero-panel">
        <div>
          <div className="chip">PREMIUM DASHBOARD</div>
          <h2>aloo SMM boshqaruv paneli</h2>
          <p>Hisobotlar, KPI, bonus, reja va kontent nazorati uchun premium admin panel.</p>
        </div>
      </div>
      <div className="cards-grid">
        {cards.map(([label, value]) => (
          <div key={label} className="stat-card"><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
    </div>
  );
}

function CrudPage({ entity, user }) {
  const config = ENTITY_CONFIG[entity];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(config.blank);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    try { setRows(await api.list(entity)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [entity]);

  const filtered = useMemo(() => rows.filter(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())), [rows, q]);

  const save = async () => {
    const payload = { ...form };
    if (entity === 'content' || entity === 'tasks' || entity === 'reports') payload.created_by = user.id;
    if (editing) await api.update(entity, editing, payload);
    else await api.create(entity, payload);
    setForm(config.blank);
    setEditing(null);
    await load();
  };

  const startEdit = (row) => {
    setEditing(row.id);
    setForm({ ...config.blank, ...row });
  };

  const remove = async (id) => {
    if (!confirm('Rostdan o‘chirasizmi?')) return;
    await api.remove(entity, id);
    await load();
  };

  const doExport = (kind) => api.exportFile(`/api/${entity}/export/${kind}`, `${entity}.${kind === 'excel' ? 'xlsx' : 'pdf'}`);

  return (
    <div className="stack">
      <div className="panel-head">
        <div><h2>{config.title}</h2><p>Jadval ko‘rinishi, qidiruv, export va CRUD</p></div>
        <div className="row gap">
          <div className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidiruv" /></div>
          {entity !== 'bonus' && entity !== 'uploads' && <button className="btn ghost" onClick={() => { setEditing(null); setForm(config.blank); }}><Plus size={16} /> Yangi</button>}
          {(entity === 'content' || entity === 'reports' || entity === 'bonus') && <button className="btn ghost" onClick={() => doExport('excel')}><Download size={16} /> Excel</button>}
          {(entity === 'content' || entity === 'reports') && <button className="btn ghost" onClick={() => doExport('pdf')}><Download size={16} /> PDF</button>}
        </div>
      </div>

      {!config.readonly && (
        <div className="card form-card">
          <h3>{editing ? 'Tahrirlash' : 'Yangi yozuv'}</h3>
          <div className="form-grid">
            {config.columns.map(([key, label]) => (
              <div key={key}>
                <label>{label}</label>
                <Input value={form[key] ?? ''} onChange={(v) => setForm({ ...form, [key]: v })} />
              </div>
            ))}
            {entity === 'team' && (
              <div>
                <label>Parol</label>
                <Input value={form.password ?? ''} onChange={(v) => setForm({ ...form, password: v })} />
              </div>
            )}
          </div>
          <div className="row gap"><button className="btn primary" onClick={save}>{editing ? 'Saqlash' : 'Qo‘shish'}</button></div>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              {config.columns.map(([key, label]) => <th key={key}>{label}</th>)}
              {!config.readonly && <th>Amallar</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={config.columns.length + 1}>Yuklanmoqda...</td></tr> : filtered.map((row) => (
              <tr key={row.id}>
                {config.columns.map(([key]) => <td key={key}>{String(row[key] ?? '')}</td>)}
                {!config.readonly && (
                  <td className="row gap">
                    <button className="btn ghost small" onClick={() => startEdit(row)}>Tahrir</button>
                    <button className="btn danger small" onClick={() => remove(row.id)}><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
            {!loading && filtered.length === 0 && <tr><td colSpan={config.columns.length + 1}>Ma'lumot yo‘q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPage({ settings, setSettings, theme, setTheme, changePassword }) {
  const [local, setLocal] = useState(settings || {});
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  useEffect(() => setLocal(settings || {}), [settings]);
  const save = async () => setSettings(await api.settings.update(local));

  return (
    <div className="stack">
      <div className="card form-card">
        <h3>Panel va kompaniya sozlamalari</h3>
        <div className="form-grid">
          <div><label>Kompaniya</label><Input value={local.company_name || ''} onChange={(v) => setLocal({ ...local, company_name: v })} /></div>
          <div><label>Bo‘lim</label><Input value={local.department_name || ''} onChange={(v) => setLocal({ ...local, department_name: v })} /></div>
          <div><label>Theme default</label><Input value={local.theme_default || theme} onChange={(v) => setLocal({ ...local, theme_default: v })} /></div>
          <div><label>Telegram</label><Input value={local.telegram_url || ''} onChange={(v) => setLocal({ ...local, telegram_url: v })} /></div>
          <div><label>Instagram</label><Input value={local.instagram_url || ''} onChange={(v) => setLocal({ ...local, instagram_url: v })} /></div>
          <div><label>YouTube</label><Input value={local.youtube_url || ''} onChange={(v) => setLocal({ ...local, youtube_url: v })} /></div>
          <div><label>Website</label><Input value={local.website_url || ''} onChange={(v) => setLocal({ ...local, website_url: v })} /></div>
        </div>
        <div className="row gap wrap">
          <button className="btn primary" onClick={save}>Saqlash</button>
          <button className="btn ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />} Rejim</button>
        </div>
      </div>
      <div className="card form-card">
        <h3>Parolni almashtirish</h3>
        <div className="form-grid two">
          <div><label>Joriy parol</label><Input type="password" value={pwd.currentPassword} onChange={(v) => setPwd({ ...pwd, currentPassword: v })} /></div>
          <div><label>Yangi parol</label><Input type="password" value={pwd.newPassword} onChange={(v) => setPwd({ ...pwd, newPassword: v })} /></div>
        </div>
        <button className="btn primary" onClick={() => changePassword(pwd)}>Parolni almashtirish</button>
      </div>
    </div>
  );
}

function UploadsPage() {
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const load = async () => setRows(await api.list('uploads'));
  useEffect(() => { load(); }, []);
  const submit = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    await api.upload(fd);
    setFile(null);
    await load();
  };
  const remove = async (id) => { if (confirm('O‘chirish?')) { await api.remove('uploads', id); await load(); } };
  return (
    <div className="stack">
      <div className="card form-card">
        <h3>Fayl yuklash</h3>
        <div className="row gap wrap">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn primary" onClick={submit}><Upload size={16} /> Yuklash</button>
        </div>
      </div>
      <div className="table-card">
        <table>
          <thead><tr><th>Nomi</th><th>Tip</th><th>Hajm</th><th>URL</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{r.original_name}</td><td>{r.mime_type}</td><td>{r.file_size}</td><td><a href={r.file_url} target="_blank" rel="noreferrer">Ochish</a></td><td><button className="btn danger small" onClick={() => remove(r.id)}>O‘chirish</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('aloo_theme') || 'dark');
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('aloo_theme', theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('aloo_token');
    if (token) {
      api.me().then(setUser).catch(() => localStorage.removeItem('aloo_token'));
      api.dashboard().then(setSummary).catch(() => {});
      api.settings.get().then(setSettings).catch(() => {});
    }
  }, []);

  const onLogin = async (u) => {
    setUser(u);
    setSummary(await api.dashboard());
    setSettings(await api.settings.get());
  };
  const onLogout = () => { localStorage.removeItem('aloo_token'); setUser(null); };
  const changePassword = async (payload) => { await api.changePassword(payload); alert('Parol yangilandi'); };

  if (!user) return <Login onLogin={onLogin} theme={theme} setTheme={setTheme} />;

  const CurrentIcon = nav.find(([id]) => id === page)?.[2] || LayoutDashboard;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-logo">a</div><div><strong>{settings?.company_name || 'aloo'}</strong><span>{settings?.department_name || 'SMM department'}</span></div></div>
        <div className="sidebar-search"><Search size={16} /><input placeholder="Menu qidirish" /></div>
        <nav className="nav-list">
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}><Icon size={16} /> {label}</button>
          ))}
        </nav>
      </aside>
      <main className="content">
        <TopBar title={nav.find(([id]) => id === page)?.[1] || 'Dashboard'} user={user} theme={theme} setTheme={setTheme} onLogout={onLogout} />
        {page === 'dashboard' && <Dashboard summary={summary} />}
        {page === 'settings' && <SettingsPage settings={settings} setSettings={setSettings} theme={theme} setTheme={setTheme} changePassword={changePassword} />}
        {page === 'uploads' && <UploadsPage />}
        {ENTITY_CONFIG[page] && <CrudPage entity={page} user={user} />}
        <div className="api-note">API: {API_BASE}</div>
      </main>
    </div>
  );
}
