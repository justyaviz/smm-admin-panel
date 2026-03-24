import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Camera,
  FolderKanban,
  Gift,
  Image,
  LayoutDashboard,
  Megaphone,
  Network,
  Settings,
  Users,
  Building2,
  ClipboardList,
  Plus,
  Trash2,
  LogOut,
  Search,
  Link2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Lock,
  Phone,
  Moon,
  SunMedium,
  Bell,
  Sparkles,
  Palette,
  Target,
} from "lucide-react";

const ADMIN_PHONE = "998939000";
const ADMIN_PASSWORD = "12345678";
const STORAGE_KEY = "aloo_smm_admin_final_v2";

const MENU = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  { id: "content", title: "Kontent reja", icon: ClipboardList },
  { id: "shooting", title: "Syomka", icon: Camera },
  { id: "design", title: "Dizayn markazi", icon: Image },
  { id: "social", title: "Ijtimoiy tarmoqlar", icon: Network },
  { id: "ads", title: "Reklama kampaniyalari", icon: Megaphone },
  { id: "reports", title: "Hisobotlar", icon: BarChart3 },
  { id: "bonus", title: "Bonus tizimi", icon: Gift },
  { id: "tasks", title: "Vazifalar", icon: FolderKanban },
  { id: "branches", title: "Filiallar", icon: Building2 },
  { id: "team", title: "Jamoa", icon: Users },
  { id: "media", title: "Media kutubxona", icon: Image },
  { id: "settings", title: "Sozlamalar", icon: Settings },
];

const emptyState = {
  theme: "dark",
  content: [],
  shooting: [],
  design: [],
  social: [],
  ads: [],
  reports: [],
  bonus: [],
  tasks: [],
  branches: [],
  team: [],
  media: [],
  settings: {
    companyName: "aloo",
    department: "SMM department",
    telegram: "",
    instagram: "",
    youtube: "",
    facebook: "",
    tiktok: "",
    website: "",
  },
};

const sectionMeta = {
  content: { title: "Kontent reja", columns: ["Sarlavha", "Platforma", "Sana", "Holat", "Izoh"], empty: { c1: "", c2: "", c3: "", c4: "", c5: "" } },
  shooting: { title: "Syomka", columns: ["Loyiha", "Lokatsiya", "Sana", "Mas'ul", "Holat"], empty: { c1: "", c2: "", c3: "", c4: "", c5: "" } },
  design: { title: "Dizayn markazi", columns: ["Nomi", "Turi", "Mas'ul", "Deadline", "Holat"], empty: { c1: "", c2: "", c3: "", c4: "", c5: "" } },
  social: { title: "Ijtimoiy tarmoqlar", columns: ["Platforma", "Link", "Login", "Holat", "Izoh"], empty: { c1: "", c2: "", c3: "", c4: "", c5: "" } },
  ads: { title: "Reklama kampaniyalari", columns: ["Kampaniya", "Byudjet", "Boshlanish", "Tugash", "Natija"], empty: { c1: "", c2: "", c3: "", c4: "", c5: "" } },
  reports: { title: "Hisobotlar", columns: ["Davr", "Mas'ul", "Qamrov", "Lead", "Izoh"], empty: { c1: "", c2: "", c3: "0", c4: "0", c5: "" } },
  bonus: { title: "Bonus tizimi", columns: ["Xodim", "Lavozim", "Ball", "Bonus", "Izoh"], empty: { c1: "", c2: "", c3: "0", c4: "0", c5: "" } },
  tasks: { title: "Vazifalar", columns: ["Vazifa", "Mas'ul", "Deadline", "Status", "Izoh"], empty: { c1: "", c2: "", c3: "", c4: "", c5: "" } },
  branches: { title: "Filiallar", columns: ["Filial", "Shahar", "Manager", "Telefon", "Izoh"], empty: { c1: "", c2: "", c3: "", c4: "", c5: "" } },
  media: { title: "Media kutubxona", columns: ["Nomi", "Kategoriya", "Hajm", "Link", "Izoh"], empty: { c1: "", c2: "", c3: "", c4: "", c5: "" } },
};

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw);
    return {
      ...emptyState,
      ...parsed,
      settings: { ...emptyState.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return emptyState;
  }
}

function Badge({ children, tone = "blue" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function SectionCard({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={`card fade-up ${className}`}>
      <div className="section-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark") }>
      {theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />}
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}

function TableEditor({ config, rows, setRows }) {
  const addRow = () => setRows([...rows, { id: uid(), ...config.empty }]);
  const updateRow = (id, key, value) => setRows(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  const removeRow = (id) => setRows(rows.filter((r) => r.id !== id));

  return (
    <div className="editor-wrap fade-up">
      <div className="toolbar">
        <button className="btn blue" onClick={addRow}><Plus size={16} /> Yangi qator</button>
        <Badge tone="green">Jami: {rows.length}</Badge>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {config.columns.map((col) => <th key={col}>{col}</th>)}
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="empty-cell">Hozircha ma'lumot yo‘q. “Yangi qator” tugmasi bilan boshlang.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                {Object.keys(config.empty).map((key, i) => (
                  <td key={key}>
                    <input value={row[key]} onChange={(e) => updateRow(row.id, key, e.target.value)} placeholder={config.columns[i]} />
                  </td>
                ))}
                <td><button className="icon-btn red" onClick={() => removeRow(row.id)} title="O‘chirish"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamManager({ rows, setRows }) {
  const [form, setForm] = useState({ name: "", role: "", phone: "", login: "", password: "" });
  const addEmployee = () => {
    if (!form.name.trim()) return;
    setRows([...rows, { id: uid(), ...form }]);
    setForm({ name: "", role: "", phone: "", login: "", password: "" });
  };
  const update = (id, key, value) => setRows(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  const remove = (id) => setRows(rows.filter((r) => r.id !== id));

  return (
    <div className="split-grid">
      <SectionCard title="Yangi hodim yaratish" subtitle="Login va parol berish mumkin">
        <div className="form-grid">
          <TextInput label="Ism" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <TextInput label="Lavozim" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
          <TextInput label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <TextInput label="Login" value={form.login} onChange={(v) => setForm({ ...form, login: v })} />
          <TextInput label="Parol" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        </div>
        <div className="toolbar left"><button className="btn green" onClick={addEmployee}><Plus size={16} /> Hodim qo‘shish</button></div>
      </SectionCard>

      <SectionCard title="Hodimlar ro‘yxati" subtitle="Barcha maydonlarni tahrirlash mumkin">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ism</th><th>Lavozim</th><th>Telefon</th><th>Login</th><th>Parol</th><th>Amal</th></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={6} className="empty-cell">Hozircha hodim yo‘q.</td></tr> : rows.map((row) => (
                <tr key={row.id}>
                  <td><input value={row.name || ""} onChange={(e) => update(row.id, "name", e.target.value)} /></td>
                  <td><input value={row.role || ""} onChange={(e) => update(row.id, "role", e.target.value)} /></td>
                  <td><input value={row.phone || ""} onChange={(e) => update(row.id, "phone", e.target.value)} /></td>
                  <td><input value={row.login || ""} onChange={(e) => update(row.id, "login", e.target.value)} /></td>
                  <td><input value={row.password || ""} onChange={(e) => update(row.id, "password", e.target.value)} /></td>
                  <td><button className="icon-btn red" onClick={() => remove(row.id)}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function SettingsPage({ settings, setSettings, resetAll, theme, setTheme }) {
  const setField = (key, value) => setSettings({ ...settings, [key]: value });
  return (
    <div className="stack-gap">
      <SectionCard title="Panel ko‘rinishi" subtitle="Theme va dizayn sozlamalari">
        <div className="settings-row">
          <div className="settings-pill"><Palette size={16} /> Aktiv theme: <strong>{theme}</strong></div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </SectionCard>

      <SectionCard title="Kompaniya sozlamalari" subtitle="Asosiy ma'lumotlarni shu yerdan boshqaring">
        <div className="form-grid three">
          <TextInput label="Kompaniya nomi" value={settings.companyName} onChange={(v) => setField("companyName", v)} />
          <TextInput label="Bo‘lim" value={settings.department} onChange={(v) => setField("department", v)} />
          <TextInput label="Website" value={settings.website} onChange={(v) => setField("website", v)} />
        </div>
      </SectionCard>

      <SectionCard title="Ijtimoiy tarmoqlarni ulash" subtitle="Havolalarni kiriting va saqlang">
        <div className="form-grid three">
          <TextInput label="Telegram" value={settings.telegram} onChange={(v) => setField("telegram", v)} placeholder="https://t.me/..." />
          <TextInput label="Instagram" value={settings.instagram} onChange={(v) => setField("instagram", v)} placeholder="https://instagram.com/..." />
          <TextInput label="YouTube" value={settings.youtube} onChange={(v) => setField("youtube", v)} placeholder="https://youtube.com/..." />
          <TextInput label="Facebook" value={settings.facebook} onChange={(v) => setField("facebook", v)} placeholder="https://facebook.com/..." />
          <TextInput label="TikTok" value={settings.tiktok} onChange={(v) => setField("tiktok", v)} placeholder="https://tiktok.com/..." />
        </div>
        <div className="social-links-preview">
          {[["Telegram", settings.telegram],["Instagram", settings.instagram],["YouTube", settings.youtube],["Facebook", settings.facebook],["TikTok", settings.tiktok]].map(([name, link]) => (
            <div key={name} className="social-item">
              <div><strong>{name}</strong><p>{link || "Ulanmagan"}</p></div>
              {link ? <a className="btn sky small" href={link} target="_blank" rel="noreferrer"><Link2 size={14} /> Ochish</a> : <Badge tone="red">Ulanmagan</Badge>}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Tizim nazorati" subtitle="Barcha ma'lumotni nol holatga qaytarish mumkin">
        <div className="toolbar left"><button className="btn red" onClick={resetAll}><Trash2 size={16} /> Barchasini tozalash</button></div>
      </SectionCard>
    </div>
  );
}

function Dashboard({ data }) {
  const cards = [
    { title: "Kontentlar", value: data.content.length, tone: "blue", icon: ClipboardList },
    { title: "Vazifalar", value: data.tasks.length, tone: "green", icon: Target },
    { title: "Kampaniyalar", value: data.ads.length, tone: "sky", icon: Megaphone },
    { title: "Hodimlar", value: data.team.length, tone: "red", icon: Users },
  ];

  return (
    <div className="stack-gap">
      <div className="hero card fade-up">
        <div>
          <div className="hero-badge"><Sparkles size={15} /> Premium dashboard</div>
          <h2>{data.settings.companyName || "aloo"} SMM boshqaruv paneli</h2>
          <p>Hisobot, KPI, bonus, reja va kontent nazorati uchun zamonaviy, toza va qulay panel.</p>
        </div>
        <div className="hero-actions">
          <button className="btn darkghost">Yangi task</button>
          <button className="btn blue">Hisobot yaratish</button>
        </div>
      </div>

      <div className="cards4">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="stat-card white float-card">
              <div className="stat-icon-row"><div className={`mini-icon ${item.tone}`}><Icon size={16} /></div><Badge tone={item.tone}>0 dan boshlandi</Badge></div>
              <div className="stat-topline">{item.title}</div>
              <div className="stat-number">{item.value}</div>
            </div>
          );
        })}
      </div>

      <div className="split-grid">
        <SectionCard title="Bugungi holat" subtitle="Panel to‘liq ishlaydi, ma'lumotlarni o‘zingiz kiritasiz">
          <div className="status-list">
            <div className="status-item"><CheckCircle2 size={18} /> Login form toza holatda ochiladi</div>
            <div className="status-item"><CheckCircle2 size={18} /> Matnlar endi aniq ko‘rinadi</div>
            <div className="status-item"><CheckCircle2 size={18} /> Ichki hover va kirish animatsiyalari qo‘shildi</div>
            <div className="status-item"><CheckCircle2 size={18} /> Dark va Light mode sozlamalarda mavjud</div>
          </div>
        </SectionCard>

        <SectionCard title="Tezkor eslatma" subtitle="Ma'lumotlar shu brauzerda saqlanadi">
          <div className="note-box"><AlertCircle size={18} /><p>Bu frontend panel. Kiritilgan ma'lumotlar localStorage ichida saqlanadi. Keyin backendga ulanganda umumiy tizimga o‘tadi.</p></div>
        </SectionCard>
      </div>
    </div>
  );
}

export default function App() {
  const [appData, setAppData] = useState(() => loadState());
  const [active, setActive] = useState("dashboard");
  const [loggedIn, setLoggedIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    document.documentElement.setAttribute("data-theme", appData.theme || "dark");
  }, [appData]);

  const filteredMenu = useMemo(() => !search.trim() ? MENU : MENU.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())), [search]);
  const updateSection = (key, rows) => setAppData((prev) => ({ ...prev, [key]: rows }));
  const updateSettings = (settings) => setAppData((prev) => ({ ...prev, settings }));
  const setTheme = (theme) => setAppData((prev) => ({ ...prev, theme }));
  const resetAll = () => setAppData(emptyState);

  const login = (e) => {
    e.preventDefault();
    if (phone === ADMIN_PHONE && password === ADMIN_PASSWORD) {
      setLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("Faqat belgilangan telefon raqam va parol qabul qilinadi.");
    }
  };

  if (!loggedIn) {
    return (
      <div className="login-page final-white">
        <div className="login-showcase fade-up">
          <div className="hero-badge"><Sparkles size={14} /> ALOO SMM SYSTEM</div>
          <h1>Kuchli kirish oynasi bilan zamonaviy admin panel</h1>
          <p>SMM bo‘limi uchun yagona markaz: hisobot, reja, bonus, kontent nazorati va jamoa boshqaruvi.</p>
          <div className="showcase-grid">
            <div className="showbox wide"><div className="show-title">Kontent bajarilishi</div><div className="show-big">86%</div><div className="progress"><span style={{width:'86%'}} /></div></div>
            <div className="showbox"><div className="show-title">Bugungi tasklar</div><div className="show-big">14</div><div className="show-sub">6 tasi tayyor</div></div>
            <div className="showbox"><div className="show-title">Bonus fondi</div><div className="show-big">18.4M</div><div className="show-sub">Mart bo‘yicha</div></div>
          </div>
        </div>

        <div className="login-box premium fade-up delay-2">
          <div className="login-brand">
            <div className="logo-round">a</div>
            <div><h1>{(appData.settings.companyName || 'aloo').toUpperCase()} SMM</h1><p>Admin login</p></div>
          </div>
          <div className="login-header-row"><div><strong>Xush kelibsiz</strong><span>Tizimga kirish</span></div><div className="shield-box"><ShieldCheck size={20} /></div></div>
          <form className="login-form-final" onSubmit={login} autoComplete="off">
            <label className="field"><span>Telefon raqam</span><div className="input-icon"><Phone size={16} /><input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="998939000" /></div></label>
            <label className="field"><span>Parol</span><div className="input-icon"><Lock size={16} /><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Parol" /></div></label>
            {loginError ? <div className="login-note danger"><X size={16} /> {loginError}</div> : null}
            <button className="btn blue full glow" type="submit">Tizimga kirish</button>
            <div className="demo-box">Demo login: <strong>{ADMIN_PHONE}</strong> • Demo parol: <strong>{ADMIN_PASSWORD}</strong></div>
          </form>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  let content = null;
  if (active === "dashboard") content = <Dashboard data={appData} />;
  if (sectionMeta[active]) content = <TableEditor config={sectionMeta[active]} rows={appData[active]} setRows={(rows) => updateSection(active, rows)} />;
  if (active === "team") content = <TeamManager rows={appData.team} setRows={(rows) => updateSection("team", rows)} />;
  if (active === "settings") content = <SettingsPage settings={appData.settings} setSettings={updateSettings} resetAll={resetAll} theme={appData.theme} setTheme={setTheme} />;

  return (
    <div className="app white-bg">
      <aside className="sidebar-white fade-in-side">
        <div className="sidebar-top">
          <div className="logo-round small">a</div>
          <div><h2>{appData.settings.companyName || "aloo"}</h2><p>{appData.settings.department || "SMM department"}</p></div>
        </div>
        <div className="sidebar-progress"><div className="sidebar-mini-title">Joriy oy natijasi</div><div className="sidebar-mini-big">86%</div><div className="progress slim"><span style={{width:'86%'}} /></div></div>
        <div className="search-box white"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidiruv..." /></div>
        <div className="menu-list white-menu">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={`menu-btn2 ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}><span><Icon size={16} /> {item.title}</span></button>;
          })}
        </div>
        <div className="sidebar-bottom"><button className="btn red full" onClick={() => setLoggedIn(false)}><LogOut size={16} /> Chiqish</button></div>
      </aside>

      <main className="main-white">
        <div className="topbar-white fade-up">
          <div>
            <h1>{MENU.find((m) => m.id === active)?.title || "Dashboard"}</h1>
            <p>Barcha ma'lumotlar 0 holatdan boshlanadi va siz qo‘lda kiritasiz</p>
          </div>
          <div className="top-actions">
            <div className="search-hero"><Search size={16} /><input placeholder="Qidiruv..." /></div>
            <button className="icon-pill"><Bell size={16} /></button>
            <ThemeToggle theme={appData.theme} setTheme={setTheme} />
            <div className="user-chip"><div className="user-avatar">Y</div><div><strong>Yaviz</strong><span>SMM Lead</span></div></div>
          </div>
        </div>
        {content}
      </main>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
:root{--bg:#06101d;--bg2:#0d1727;--panel:rgba(13,22,36,.8);--panel2:#101b2c;--text:#f2f6fb;--text2:#9db2cc;--border:rgba(255,255,255,.08);--blue:#2e9bff;--sky:#5edbff;--green:#2dd38f;--red:#ff6262;--shadow:0 18px 40px rgba(0,0,0,.22);--input:#0f1b2b;--inputText:#fff;--table:#0d1727;--soft:#1a2940}
:root[data-theme='light']{--bg:#eef5fb;--bg2:#f7fbff;--panel:rgba(255,255,255,.88);--panel2:#ffffff;--text:#10263f;--text2:#6f8397;--border:#dde9f5;--blue:#2394ff;--sky:#63d7ff;--green:#22b76c;--red:#ef5454;--shadow:0 16px 32px rgba(32,86,140,.08);--input:#ffffff;--inputText:#10263f;--table:#ffffff;--soft:#eff6fd}
*{box-sizing:border-box}html,body,#root{margin:0;min-height:100%;font-family:Inter,Arial,sans-serif;background:linear-gradient(180deg,var(--bg),var(--bg2));color:var(--text)}button,input{font:inherit}input{color:var(--inputText)}input::placeholder{color:var(--text2)}
.app{display:grid;grid-template-columns:290px 1fr;min-height:100vh;background:linear-gradient(180deg,var(--bg),var(--bg2))}.white-bg{background:linear-gradient(180deg,var(--bg),var(--bg2))}
.sidebar-white{background:var(--panel);backdrop-filter:blur(18px);border-right:1px solid var(--border);padding:18px;display:flex;flex-direction:column;gap:16px}.sidebar-top{display:flex;align-items:center;gap:12px;padding-bottom:8px}.sidebar-top h2{margin:0;font-size:22px}.sidebar-top p{margin:4px 0 0;color:var(--text2);font-size:13px}
.logo-round{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,var(--blue),var(--sky));color:#fff;font-weight:900;font-size:28px;box-shadow:0 12px 24px rgba(46,155,255,.26)}.logo-round.small{width:48px;height:48px;font-size:24px}
.sidebar-progress{background:linear-gradient(135deg,rgba(38,117,194,.24),rgba(15,27,43,.5));border:1px solid var(--border);padding:16px;border-radius:22px}.sidebar-mini-title{font-size:13px;color:var(--text2)}.sidebar-mini-big{font-size:34px;font-weight:900;margin:6px 0 12px}.progress{height:12px;background:rgba(255,255,255,.1);border-radius:999px;overflow:hidden}.progress span{display:block;height:100%;background:linear-gradient(90deg,var(--blue),var(--sky));border-radius:inherit}.progress.slim{height:10px}
.search-box,.search-hero{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;border:1px solid var(--border);background:var(--panel2)}.search-box input,.search-hero input{border:0;outline:0;width:100%;background:transparent;color:var(--inputText)}
.menu-list{display:grid;gap:10px}.menu-btn2{border:1px solid transparent;background:rgba(255,255,255,.04);border-radius:18px;padding:15px 16px;font-weight:800;color:var(--text);cursor:pointer;text-align:left;transition:.25s}.menu-btn2 span{display:flex;align-items:center;gap:12px}.menu-btn2:hover{transform:translateX(2px);background:rgba(255,255,255,.07)}.menu-btn2.active{background:linear-gradient(135deg,rgba(39,148,255,.26),rgba(17,42,66,.9));border-color:rgba(72,188,255,.26);box-shadow:0 14px 28px rgba(25,146,255,.18)}
.sidebar-bottom{margin-top:auto}.main-white{padding:24px}.topbar-white{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap;background:var(--panel);border:1px solid var(--border);border-radius:28px;padding:20px 22px;box-shadow:var(--shadow)}.topbar-white h1{margin:0;font-size:34px}.topbar-white p{margin:6px 0 0;color:var(--text2)}.top-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.icon-pill{width:46px;height:46px;border-radius:16px;border:1px solid var(--border);background:var(--panel2);color:var(--text);display:grid;place-items:center}.user-chip{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:18px;border:1px solid var(--border);background:var(--panel2)}.user-chip span{display:block;font-size:12px;color:var(--text2)}.user-avatar{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,var(--blue),var(--sky));font-weight:900;color:#fff}.theme-toggle{border:1px solid var(--border);background:var(--panel2);color:var(--text);border-radius:16px;padding:12px 14px;display:inline-flex;align-items:center;gap:8px;font-weight:800;cursor:pointer}
.card,.stat-card{background:var(--panel);backdrop-filter:blur(18px);border:1px solid var(--border);border-radius:28px;padding:20px;box-shadow:var(--shadow)}.section-head{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.section-head h3{margin:0;font-size:24px}.section-head p{margin:6px 0 0;color:var(--text2)}
.stack-gap{display:grid;gap:18px;margin-top:18px}.split-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.cards4{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:18px}.stat-topline{font-size:14px;color:var(--text2);margin-top:12px}.stat-number{font-size:44px;font-weight:900;margin:10px 0 0;color:var(--text)}.stat-icon-row{display:flex;justify-content:space-between;gap:10px;align-items:center}.mini-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#fff}.mini-icon.blue{background:linear-gradient(135deg,var(--blue),var(--sky))}.mini-icon.green{background:linear-gradient(135deg,#1cb56c,#47e8aa)}.mini-icon.sky{background:linear-gradient(135deg,#34aaf6,#85f0ff)}.mini-icon.red{background:linear-gradient(135deg,#ff6f6f,#ff9d9d)}
.hero{display:flex;justify-content:space-between;gap:22px;align-items:center;overflow:hidden;position:relative}.hero::after{content:'';position:absolute;right:-70px;top:-70px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(53,168,255,.24),transparent 70%);pointer-events:none}.hero h2{font-size:52px;line-height:1.05;margin:12px 0 10px}.hero p{margin:0;color:var(--text2);max-width:760px;font-size:18px;line-height:1.65}.hero-badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(85,183,255,.25);background:rgba(54,123,214,.12);padding:10px 14px;border-radius:999px;font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:#b9e6ff}.hero-actions{display:flex;gap:12px;flex-wrap:wrap}.btn{border:0;border-radius:18px;padding:13px 18px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:.22s}.btn:hover{transform:translateY(-1px)}.btn.full{width:100%;justify-content:center}.btn.small{padding:8px 12px;border-radius:12px}.btn.blue{background:linear-gradient(135deg,var(--blue),var(--sky));color:#fff;box-shadow:0 16px 34px rgba(46,155,255,.24)}.btn.green{background:linear-gradient(135deg,#22b76c,#47e8aa);color:#fff}.btn.sky{background:linear-gradient(135deg,#86ebff,#5fd4ff);color:#0d4360}.btn.red{background:linear-gradient(135deg,#ef5454,#ff8e8e);color:#fff}.btn.darkghost{background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--text)}.btn.glow{box-shadow:0 18px 40px rgba(46,155,255,.3)}
.badge{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:800}.badge-blue{background:rgba(35,148,255,.16);color:#6dc9ff}.badge-green{background:rgba(34,183,108,.14);color:#5ee5a2}.badge-sky{background:rgba(100,216,255,.14);color:#7de3ff}.badge-red{background:rgba(239,84,84,.12);color:#ff8b8b}
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}.toolbar.left{justify-content:flex-start}.table-wrap{overflow:auto;border:1px solid var(--border);border-radius:22px;background:var(--table)}.table-wrap table{width:100%;border-collapse:collapse;min-width:840px;background:transparent}.table-wrap th,.table-wrap td{padding:12px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}.table-wrap th{background:rgba(255,255,255,.03);color:var(--text2);font-size:13px}.table-wrap td input{width:100%;border:1px solid var(--border);background:var(--input);color:var(--inputText);border-radius:12px;padding:10px 12px;outline:none}.empty-cell{text-align:center;color:var(--text2);padding:24px}
.icon-btn{width:38px;height:38px;border:0;border-radius:12px;display:grid;place-items:center;cursor:pointer}.icon-btn.red{background:rgba(239,84,84,.12);color:#ff8f8f}.field{display:grid;gap:8px}.field span{font-size:13px;font-weight:700;color:var(--text2)}.field input{border:1px solid var(--border);background:var(--input);color:var(--inputText);border-radius:14px;padding:12px 14px;outline:none}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.form-grid.three{grid-template-columns:1fr 1fr 1fr}
.status-list{display:grid;gap:12px}.status-item{display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:16px;color:var(--text)}.status-item svg{color:#56df9b}.note-box{display:flex;align-items:flex-start;gap:10px;padding:16px;border-radius:18px;background:rgba(255,214,79,.08);border:1px solid rgba(255,214,79,.18);color:var(--text)}.social-links-preview{display:grid;gap:12px}.social-item{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:14px 16px;border:1px solid var(--border);border-radius:18px;background:rgba(255,255,255,.03)}.social-item p{margin:4px 0 0;color:var(--text2);word-break:break-all}
.settings-row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}.settings-pill{display:inline-flex;align-items:center;gap:8px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--text)}
.login-page.final-white{display:grid;grid-template-columns:1.2fr .9fr;gap:42px;align-items:center;min-height:100vh;padding:32px;background:radial-gradient(circle at 20% 10%,rgba(49,156,255,.2),transparent 25%),linear-gradient(180deg,var(--bg),var(--bg2))}.login-showcase h1{font-size:70px;line-height:1.03;max-width:820px;margin:18px 0}.login-showcase p{max-width:680px;color:var(--text2);font-size:18px;line-height:1.7}.showcase-grid{margin-top:34px;display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:760px}.showbox{background:rgba(255,255,255,.08);border:1px solid var(--border);border-radius:28px;padding:20px;backdrop-filter:blur(18px)}.showbox.wide{grid-column:1/-1}.show-title{font-size:15px;color:var(--text2)}.show-big{font-size:56px;font-weight:900;margin:10px 0}.show-sub{color:var(--text2)}
.login-box{width:min(500px,92vw);background:rgba(21,34,52,.78);border:1px solid var(--border);border-radius:34px;padding:28px;box-shadow:0 22px 60px rgba(0,0,0,.24);backdrop-filter:blur(18px)}.login-box.premium{justify-self:end}.login-brand{display:flex;align-items:center;gap:14px;margin-bottom:16px}.login-brand h1{margin:0;font-size:32px;color:var(--text)}.login-brand p{margin:4px 0 0;color:var(--text2)}.login-header-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.login-header-row strong{display:block;font-size:28px}.login-header-row span{display:block;color:var(--text2);margin-top:4px}.shield-box{width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,var(--blue),var(--sky));display:grid;place-items:center;color:#fff;box-shadow:0 12px 30px rgba(46,155,255,.28)}
.login-form-final{display:grid;gap:14px}.input-icon{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:18px;padding:13px 14px;background:rgba(8,16,29,.35)}.input-icon input{border:0;outline:0;width:100%;background:transparent;color:#fff}.login-note{display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:14px;margin-bottom:2px;font-size:14px}.login-note.danger{background:rgba(239,84,84,.12);color:#ff9d9d}.demo-box{padding:13px 14px;border-radius:14px;border:1px solid rgba(67,156,255,.22);background:rgba(36,108,182,.12);font-size:14px;color:#cbe8ff}
.fade-up{animation:fadeUp .55s ease both}.delay-2{animation-delay:.15s}.fade-in-side{animation:fadeSide .55s ease both}.float-card{animation:floaty 5s ease-in-out infinite}.stat-card:nth-child(2){animation-delay:.6s}.stat-card:nth-child(3){animation-delay:1.1s}.stat-card:nth-child(4){animation-delay:1.6s}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeSide{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@media (max-width:1180px){.login-page.final-white,.app,.split-grid,.cards4,.form-grid,.form-grid.three{grid-template-columns:1fr}.hero{flex-direction:column;align-items:flex-start}.login-box.premium{justify-self:stretch}.main-white{padding:14px}.topbar-white h1{font-size:28px}.hero h2{font-size:42px}.login-showcase h1{font-size:48px}.showcase-grid{grid-template-columns:1fr}.sidebar-white{border-right:0;border-bottom:1px solid var(--border)}}
`;
