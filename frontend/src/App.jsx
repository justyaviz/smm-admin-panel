import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileBarChart,
  FileText,
  FolderKanban,
  HelpCircle,
  Home,
  Image,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PlaySquare,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Target,
  TrendingUp,
  User,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  Eye,
  EyeOff,
  Send,
} from 'lucide-react';

const LOGIN_KEY = 'aloo_smm_session';
const runtimeApiUrl = typeof window !== 'undefined' ? window.__ALOOSMM_CONFIG__?.API_URL : '';
const API_URL = (runtimeApiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Server bilan aloqa xatosi.');
  return payload;
}

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Kontent', icon: FolderKanban },
  { label: 'Kalendar', icon: CalendarDays },
  { label: 'Kampaniyalar', icon: Megaphone },
  { label: 'Target reklama', icon: Target },
  { label: 'Analitika', icon: BarChart3 },
  { label: 'Hisobotlar', icon: FileBarChart },
  { label: 'Media', icon: Image },
  { label: 'Filiallar', icon: Store },
  { label: 'Vazifalar', icon: ClipboardCheck },
  { label: 'Jamoa', icon: UsersRound },
  { label: 'Xarajatlar', icon: CircleDollarSign },
  { label: 'Chat', icon: MessageCircle, dot: true },
  { label: 'Sozlamalar', icon: Settings },
];

const branches = [
  { rank: 1, name: 'Chirchiq', reach: '245 300', change: '+28%', engagement: '4.2%', rate: '+0.8%', posts: 48 },
  { rank: 2, name: 'Parkent', reach: '182 450', change: '+21%', engagement: '3.6%', rate: '+0.6%', posts: 42 },
  { rank: 3, name: 'Chinoz', reach: '158 900', change: '+19%', engagement: '3.1%', rate: '+0.4%', posts: 36 },
  { rank: 4, name: 'Piskent', reach: '132 700', change: '+15%', engagement: '2.9%', rate: '+0.3%', posts: 30 },
  { rank: 5, name: 'Angren', reach: '110 820', change: '+13%', engagement: '2.7%', rate: '+0.2%', posts: 28 },
  { rank: 6, name: "Jarqo'rg'on", reach: '79 130', change: '+11%', engagement: '2.4%', rate: '+0.1%', posts: 24 },
];

const reportItems = [
  { type: 'DOCX', title: 'Haftalik SMM hisobot', period: '13–19 iyul', meta: '2.4 MB · bugun, 09:15' },
  { type: 'XLSX', title: 'Instagram tahlili', period: 'iyul', meta: '1.8 MB · kecha, 18:30' },
  { type: 'PDF', title: 'Reklama kampaniyalari', period: '1–15 iyul', meta: '3.1 MB · 11 iyul, 16:20' },
  { type: 'XLSX', title: "Filiallar bo'yicha tahlil", period: 'iyul', meta: '2.7 MB · 10 iyul, 14:40' },
];

const initialTasks = [
  { id: 1, label: 'Yangi kampaniya uchun banner tayyorlash', team: 'Marketing jamoasi', due: '13 iyul', done: false, urgent: true },
  { id: 2, label: 'Chirchiq filiali uchun reels kontent', team: 'Kontent jamoasi', due: '14 iyul', done: false },
  { id: 3, label: 'Instagram bio yangilash', team: 'SMM jamoasi', due: 'Bajarildi', done: true },
  { id: 4, label: 'Oylik hisobotni tayyorlash', team: 'Analitika jamoasi', due: 'Bajarildi', done: true },
];

function App() {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem(LOGIN_KEY) || sessionStorage.getItem(LOGIN_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!session?.token) return undefined;
    let cancelled = false;
    apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${session.token}` },
    }).then(({ user }) => {
      if (!cancelled) setSession((current) => current ? { ...current, user } : current);
    }).catch(() => {
      if (!cancelled) {
        localStorage.removeItem(LOGIN_KEY);
        sessionStorage.removeItem(LOGIN_KEY);
        setSession(null);
      }
    });
    return () => { cancelled = true; };
  }, [session?.token]);

  const onLogin = ({ remember, token, user }) => {
    const value = { token, user };
    const serialized = JSON.stringify(value);
    localStorage.removeItem(LOGIN_KEY);
    sessionStorage.removeItem(LOGIN_KEY);
    if (remember) localStorage.setItem(LOGIN_KEY, serialized);
    else sessionStorage.setItem(LOGIN_KEY, serialized);
    setSession(value);
  };

  const logout = () => {
    localStorage.removeItem(LOGIN_KEY);
    sessionStorage.removeItem(LOGIN_KEY);
    setSession(null);
  };

  return (
    <>
      {session ? <Dashboard session={session} onLogout={logout} notify={setToast} /> : <Login onLogin={onLogin} notify={setToast} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function Brand({ compact = false, inverted = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''} ${inverted ? 'brand--inverted' : ''}`}>
      <img src="/assets/aloo-logo.png" alt="aloo" />
      <span>SMM Panel</span>
    </div>
  );
}

function Login({ onLogin, notify }) {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('aloo2026');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!login.trim() || !password.trim()) {
      setError('Login va parolni to‘liq kiriting.');
      return;
    }
    setLoading(true);
    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: login.trim(), password }),
      });
      onLogin({ remember, token: result.token, user: result.user });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="hero-grid" />
        <div className="hero-content">
          <Brand />
          <div className="hero-copy">
            <p className="eyebrow">ALOOSMM.UZ</p>
            <h1>Aloo do‘konlar tarmog‘i uchun SMM boshqaruv tizimi</h1>
            <p className="hero-description">
              Kontent rejalari, reklama kampaniyalari, filiallar va hisobotlarni bitta qulay paneldan boshqaring.
            </p>
          </div>

          <div className="feature-list">
            <Feature icon={CalendarDays} title="Kontent rejasi va kalendar" text="Postlar rejasini tuzing va jarayonni nazorat qiling." />
            <Feature icon={BarChart3} title="Analitika va hisobotlar" text="Natijalarni tahlil qiling va o‘sishni kuzatib boring." />
            <Feature icon={Target} title="Target reklama nazorati" text="Reklama kampaniyalari samaradorligini boshqaring." />
          </div>
        </div>
        <img className="login-illustration" src="/assets/login-illustration.png" alt="SMM boshqaruv vizuali" />
      </section>

      <section className="login-panel">
        <div className="connected-badge"><Check size={16} /> aloosmm.uz bilan bog‘langan</div>
        <form className="login-card" onSubmit={submit}>
          <div className="mobile-brand"><Brand compact /></div>
          <div className="login-heading">
            <span className="login-icon"><LockKeyhole size={22} /></span>
            <div>
              <h2>Tizimga kirish</h2>
              <p>Aloo SMM jamoasi kabinetiga xush kelibsiz</p>
            </div>
          </div>

          <label className="field-label" htmlFor="login">Login yoki telefon raqami</label>
          <div className="input-wrap">
            <UserRound size={19} />
            <input id="login" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Login yoki telefon raqamingiz" autoComplete="username" />
          </div>

          <label className="field-label" htmlFor="password">Parol</label>
          <div className="input-wrap">
            <LockKeyhole size={19} />
            <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Parolni kiriting" autoComplete="current-password" />
            <button type="button" className="icon-button password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label="Parolni ko‘rsatish">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="login-options">
            <label className="checkbox-row">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span className="custom-check"><Check size={13} /></span>
              Meni eslab qol
            </label>
            <button type="button" className="link-button" onClick={() => notify('Parol tiklash backend bilan keyingi bosqichda ulanadi.')}>Parolni unutdingizmi?</button>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? <span className="spinner" /> : 'Kirish'}
          </button>

          <div className="divider"><span>yoki</span></div>

          <button type="button" className="telegram-button" onClick={() => notify('Telegram orqali kirish keyingi bosqichda xavfsiz backend bilan ulanadi.')}>
            <Send size={19} /> Telegram orqali kirish
          </button>

          <div className="demo-note">
            Kirish ma’lumotlari backend va PostgreSQL orqali tekshiriladi
          </div>
        </form>
        <div className="login-footer"><LockKeyhole size={15} /> Faqat aloo xodimlari uchun</div>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="feature-item">
      <span className="feature-icon"><Icon size={22} /></span>
      <div><strong>{title}</strong><p>{text}</p></div>
    </div>
  );
}

function Dashboard({ session, onLogout, notify }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [rangeOpen, setRangeOpen] = useState(false);

  const dateRange = useMemo(() => getCurrentWeekRange(), []);
  const currentUser = session?.user || {};
  const userName = currentUser.fullName || currentUser.full_name || 'Aloo xodimi';
  const userRole = currentUser.role || 'SMM menejer';
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AL';

  const toggleTask = (id) => {
    setTasks((items) => items.map((task) => task.id === id ? { ...task, done: !task.done, due: !task.done ? 'Bajarildi' : '14 iyul' } : task));
  };

  return (
    <main className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <aside className={`sidebar ${mobileNav ? 'sidebar--mobile-open' : ''}`}>
        <div className="sidebar-top">
          <Brand compact />
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X size={20} /></button>
        </div>

        <nav className="nav-list">
          {menuItems.map(({ label, icon: Icon, active, dot }) => (
            <button key={label} className={`nav-item ${active ? 'nav-item--active' : ''}`} onClick={() => active ? setMobileNav(false) : notify(`${label} sahifasi keyingi bosqichda dasturlanadi.`)}>
              <Icon size={20} />
              <span>{label}</span>
              {dot && <i className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="support-card">
          <span className="support-icon"><HelpCircle size={23} /></span>
          <div><strong>Yordam kerakmi?</strong><span>Biz bilan bog‘laning</span></div>
          <ChevronRight size={17} />
        </div>

        <button className="sidebar-collapse" onClick={() => setSidebarOpen((v) => !v)}>
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </aside>
      {mobileNav && <button aria-label="Menyuni yopish" className="mobile-overlay" onClick={() => setMobileNav(false)} />}

      <section className="app-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={22} /></button>
            <div className="global-search"><Search size={18} /><input placeholder="Qidirish..." /><kbd>⌘ K</kbd></div>
          </div>
          <div className="topbar-actions">
            <div className="range-wrap">
              <button className="date-button" onClick={() => setRangeOpen((v) => !v)}><CalendarDays size={18} /> {dateRange}<ChevronDown size={16} /></button>
              {rangeOpen && <div className="range-popover"><strong>Hisobot davri</strong><span>Joriy hafta</span><button onClick={() => { setRangeOpen(false); notify('Sana filtri tanlandi.'); }}>Qo‘llash</button></div>}
            </div>
            <button className="notification-button" onClick={() => notify('3 ta yangi bildirishnoma bor.')}><Bell size={20} /><span>3</span></button>
            <div className="domain-chip"><span>◉</span> aloosmm.uz</div>
            <div className="profile-wrap">
              <button className="profile-button" onClick={() => setProfileOpen((v) => !v)}>
                <span className="avatar">{initials}</span>
                <span className="profile-copy"><strong>{userName}</strong><small>{userRole}</small></span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && <div className="profile-menu"><button><User size={17} /> Profil</button><button onClick={onLogout}><LogOut size={17} /> Chiqish</button></div>}
            </div>
          </div>
        </header>

        <div className="dashboard-page">
          <div className="page-heading">
            <div><h1>Dashboard</h1><p>Aloo do‘konlar tarmog‘i bo‘yicha umumiy SMM holati</p></div>
            <button className="secondary-action" onClick={() => notify('Dashboard ma’lumotlari yangilandi.')}><TrendingUp size={18} /> Ma’lumotlarni yangilash</button>
          </div>

          <section className="kpi-grid">
            <KpiCard icon={FileText} label="Jami postlar" value="248" trend="+18%" note="o‘tgan haftaga nisbatan" />
            <KpiCard icon={Megaphone} label="Faol kampaniyalar" value="12" trend="+2 ta" note="yangi kampaniya" />
            <KpiCard icon={WalletCards} label="Reklama budjeti" value="23 450 000 so‘m" trend="+12%" note="reja bajarilishi" />
            <KpiCard icon={UsersRound} label="Umumiy reach" value="1 245 300" trend="+24%" note="o‘tgan haftaga nisbatan" />
            <KpiCard icon={PlaySquare} label="Video ko‘rishlar" value="856 210" trend="+31%" note="o‘tgan haftaga nisbatan" />
            <KpiCard icon={ShoppingBag} label="Faol filiallar" value="24 / 24" trend="100%" note="barcha filiallar faol" />
          </section>

          <section className="dashboard-grid dashboard-grid--top">
            <CalendarSummary />
            <CampaignChart />
            <PlatformChart />
          </section>

          <section className="dashboard-grid dashboard-grid--bottom">
            <BranchesCard />
            <ReportsCard />
            <TasksCard tasks={tasks} toggleTask={toggleTask} />
          </section>
        </div>
      </section>
    </main>
  );
}

function KpiCard({ icon: Icon, label, value, trend, note }) {
  return (
    <article className="kpi-card">
      <div className="kpi-top"><span className="kpi-icon"><Icon size={21} /></span><span>{label}</span></div>
      <strong className="kpi-value">{value}</strong>
      <div className="kpi-trend"><TrendingUp size={14} /><b>{trend}</b><span>{note}</span></div>
    </article>
  );
}

function CardHeader({ title, action }) {
  return <div className="card-header"><h3>{title}</h3>{action}</div>;
}

function CalendarSummary() {
  const days = [
    ['Dush', '13', 12], ['Sesh', '14', 10], ['Chor', '15', 14], ['Pay', '16', 11], ['Juma', '17', 13], ['Shan', '18', 8], ['Yak', '19', 7],
  ];
  return (
    <article className="dashboard-card calendar-summary">
      <CardHeader title="Kontent taqvimi (haftalik)" action={<button className="more-button">•••</button>} />
      <div className="week-row">
        {days.map(([name, date, count], i) => <div key={name} className={`week-day ${i === 2 ? 'week-day--active' : ''}`}><span>{name}</span><b>{date}</b><strong>{count}</strong><small>post</small></div>)}
      </div>
      <div className="progress-track"><span style={{ width: '88%' }} /></div>
      <div className="progress-caption"><span>75 post rejalashtirilgan</span><b>85 jami post</b></div>
    </article>
  );
}

function CampaignChart() {
  const points1 = '5,88 65,76 125,42 185,68 245,62 305,45 365,70 425,56 485,76';
  const points2 = '5,116 65,128 125,101 185,126 245,119 305,101 365,124 425,111 485,128';
  return (
    <article className="dashboard-card campaign-chart">
      <CardHeader title="Kampaniyalar samaradorligi" action={<button className="small-select">Haftalik <ChevronDown size={14} /></button>} />
      <div className="chart-legend"><span><i className="legend-dot legend-dot--blue" />Reach</span><span><i className="legend-dot legend-dot--sky" />CTR (%)</span></div>
      <div className="line-chart-wrap">
        <div className="y-labels"><span>300K</span><span>200K</span><span>100K</span><span>0</span></div>
        <svg viewBox="0 0 490 150" role="img" aria-label="Kampaniyalar grafigi">
          {[25, 65, 105, 145].map((y) => <line key={y} x1="0" y1={y} x2="490" y2={y} className="grid-line" />)}
          <polyline points={points1} className="chart-line chart-line--blue" />
          <polyline points={points2} className="chart-line chart-line--sky" />
          {points1.split(' ').map((p) => { const [x,y] = p.split(','); return <circle key={`a${x}`} cx={x} cy={y} r="4" className="chart-dot chart-dot--blue" />; })}
          {points2.split(' ').map((p) => { const [x,y] = p.split(','); return <circle key={`b${x}`} cx={x} cy={y} r="3.5" className="chart-dot chart-dot--sky" />; })}
        </svg>
        <div className="x-labels"><span>13 iyul</span><span>15 iyul</span><span>17 iyul</span><span>19 iyul</span></div>
      </div>
    </article>
  );
}

function PlatformChart() {
  const items = [
    ['Instagram', '45%', '#ff7a7a'], ['Facebook', '25%', '#2f7df6'], ['Telegram', '15%', '#28b9d7'], ['YouTube', '10%', '#ef2d2d'], ['TikTok', '5%', '#111827'],
  ];
  return (
    <article className="dashboard-card platform-card">
      <CardHeader title="Platformalar bo‘yicha samaradorlik" />
      <div className="platform-layout">
        <div className="donut"><div><b>1 245 300</b><span>Umumiy reach</span></div></div>
        <div className="platform-list">
          {items.map(([name, percent, color]) => <div key={name}><span><i style={{ background: color }} />{name}</span><b>{percent}</b></div>)}
        </div>
      </div>
    </article>
  );
}

function BranchesCard() {
  return (
    <article className="dashboard-card branches-card">
      <CardHeader title="Filiallar bo‘yicha samaradorlik" />
      <div className="table-scroll">
        <table>
          <thead><tr><th>Filial</th><th>Reach</th><th>Engagement</th><th>Postlar</th></tr></thead>
          <tbody>{branches.map((branch) => <tr key={branch.name}>
            <td><span className="rank">{branch.rank}</span><span className="branch-avatar">{branch.name.slice(0, 2).toUpperCase()}</span><b>{branch.name}</b></td>
            <td>{branch.reach} <em>{branch.change}</em></td>
            <td>{branch.engagement} <em>{branch.rate}</em></td>
            <td><strong>{branch.posts}</strong></td>
          </tr>)}</tbody>
        </table>
      </div>
      <button className="card-link">Barcha filiallarni ko‘rish <ChevronRight size={16} /></button>
    </article>
  );
}

function ReportsCard() {
  return (
    <article className="dashboard-card reports-card">
      <CardHeader title="So‘nggi hisobotlar" />
      <div className="report-list">
        {reportItems.map((report) => <div className="report-row" key={report.title}>
          <span className={`file-badge file-badge--${report.type.toLowerCase()}`}>{report.type}</span>
          <div><strong>{report.title} <small>({report.period})</small></strong><span>{report.meta}</span></div>
          <button className="download-button">↓</button>
        </div>)}
      </div>
      <button className="card-link">Barcha hisobotlarni ko‘rish <ChevronRight size={16} /></button>
    </article>
  );
}

function TasksCard({ tasks, toggleTask }) {
  return (
    <article className="dashboard-card tasks-card">
      <CardHeader title="Tezkor vazifalar" action={<button className="mini-primary">+ Yangi vazifa</button>} />
      <div className="task-list">
        {tasks.map((task) => <button key={task.id} className="task-row" onClick={() => toggleTask(task.id)}>
          <span className={`task-check ${task.done ? 'task-check--done' : ''}`}>{task.done && <Check size={14} />}</span>
          <span className="task-copy"><strong>{task.label}</strong><small>{task.team}</small></span>
          <span className={`task-due ${task.done ? 'task-due--done' : task.urgent ? 'task-due--urgent' : ''}`}>{task.due}</span>
        </button>)}
      </div>
      <button className="card-link">Barcha vazifalarni ko‘rish <ChevronRight size={16} /></button>
    </article>
  );
}

function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  if (monday.getMonth() === sunday.getMonth()) return `${monday.getDate()}–${sunday.getDate()} ${months[sunday.getMonth()]}, ${sunday.getFullYear()}`;
  return `${monday.getDate()} ${months[monday.getMonth()]} – ${sunday.getDate()} ${months[sunday.getMonth()]}, ${sunday.getFullYear()}`;
}

export default App;
