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
  Pencil,
  Save,
  LogOut,
  Search,
  Link2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Lock,
  Phone,
} from "lucide-react";

const ADMIN_PHONE = "998939000";
const ADMIN_PASSWORD = "12345678";
const STORAGE_KEY = "aloo_smm_admin_final_v1";

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
  content: {
    title: "Kontent reja",
    columns: ["Sarlavha", "Platforma", "Sana", "Holat", "Izoh"],
    empty: { c1: "", c2: "", c3: "", c4: "", c5: "" },
  },
  shooting: {
    title: "Syomka",
    columns: ["Loyiha", "Lokatsiya", "Sana", "Mas'ul", "Holat"],
    empty: { c1: "", c2: "", c3: "", c4: "", c5: "" },
  },
  design: {
    title: "Dizayn markazi",
    columns: ["Nomi", "Turi", "Mas'ul", "Deadline", "Holat"],
    empty: { c1: "", c2: "", c3: "", c4: "", c5: "" },
  },
  social: {
    title: "Ijtimoiy tarmoqlar",
    columns: ["Platforma", "Link", "Login", "Holat", "Izoh"],
    empty: { c1: "", c2: "", c3: "", c4: "", c5: "" },
  },
  ads: {
    title: "Reklama kampaniyalari",
    columns: ["Kampaniya", "Byudjet", "Boshlanish", "Tugash", "Natija"],
    empty: { c1: "", c2: "", c3: "", c4: "", c5: "" },
  },
  reports: {
    title: "Hisobotlar",
    columns: ["Davr", "Mas'ul", "Qamrov", "Lead", "Izoh"],
    empty: { c1: "", c2: "", c3: "0", c4: "0", c5: "" },
  },
  bonus: {
    title: "Bonus tizimi",
    columns: ["Xodim", "Lavozim", "Ball", "Bonus", "Izoh"],
    empty: { c1: "", c2: "", c3: "0", c4: "0", c5: "" },
  },
  tasks: {
    title: "Vazifalar",
    columns: ["Vazifa", "Mas'ul", "Deadline", "Status", "Izoh"],
    empty: { c1: "", c2: "", c3: "", c4: "", c5: "" },
  },
  branches: {
    title: "Filiallar",
    columns: ["Filial", "Shahar", "Manager", "Telefon", "Izoh"],
    empty: { c1: "", c2: "", c3: "", c4: "", c5: "" },
  },
  media: {
    title: "Media kutubxona",
    columns: ["Nomi", "Kategoriya", "Hajm", "Link", "Izoh"],
    empty: { c1: "", c2: "", c3: "", c4: "", c5: "" },
  },
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

function SectionCard({ title, subtitle, right, children }) {
  return (
    <div className="card">
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

function TableEditor({ config, rows, setRows }) {
  const addRow = () => {
    setRows([...rows, { id: uid(), ...config.empty }]);
  };

  const updateRow = (id, key, value) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const removeRow = (id) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="editor-wrap">
      <div className="toolbar">
        <button className="btn blue" onClick={addRow}><Plus size={16} /> Yangi qator</button>
        <Badge tone="green">Jami: {rows.length}</Badge>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {config.columns.map((col, idx) => (
                <th key={col}>{col}</th>
              ))}
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-cell">Hozircha ma'lumot yo‘q. “Yangi qator” tugmasi bilan boshlang.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {Object.keys(config.empty).map((key, i) => (
                    <td key={key}>
                      <input
                        value={row[key]}
                        onChange={(e) => updateRow(row.id, key, e.target.value)}
                        placeholder={config.columns[i]}
                      />
                    </td>
                  ))}
                  <td>
                    <button className="icon-btn red" onClick={() => removeRow(row.id)} title="O‘chirish">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
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
    setRows([
      ...rows,
      {
        id: uid(),
        name: form.name,
        role: form.role,
        phone: form.phone,
        login: form.login,
        password: form.password,
      },
    ]);
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
        <div className="toolbar left">
          <button className="btn green" onClick={addEmployee}><Plus size={16} /> Hodim qo‘shish</button>
        </div>
      </SectionCard>

      <SectionCard title="Hodimlar ro‘yxati" subtitle="Barcha maydonlarni tahrirlash mumkin">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ism</th>
                <th>Lavozim</th>
                <th>Telefon</th>
                <th>Login</th>
                <th>Parol</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">Hozircha hodim yo‘q.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td><input value={row.name || ""} onChange={(e) => update(row.id, "name", e.target.value)} /></td>
                    <td><input value={row.role || ""} onChange={(e) => update(row.id, "role", e.target.value)} /></td>
                    <td><input value={row.phone || ""} onChange={(e) => update(row.id, "phone", e.target.value)} /></td>
                    <td><input value={row.login || ""} onChange={(e) => update(row.id, "login", e.target.value)} /></td>
                    <td><input value={row.password || ""} onChange={(e) => update(row.id, "password", e.target.value)} /></td>
                    <td>
                      <button className="icon-btn red" onClick={() => remove(row.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function SettingsPage({ settings, setSettings, resetAll }) {
  const setField = (key, value) => setSettings({ ...settings, [key]: value });

  return (
    <div className="stack-gap">
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
          {[
            ["Telegram", settings.telegram],
            ["Instagram", settings.instagram],
            ["YouTube", settings.youtube],
            ["Facebook", settings.facebook],
            ["TikTok", settings.tiktok],
          ].map(([name, link]) => (
            <div key={name} className="social-item">
              <div>
                <strong>{name}</strong>
                <p>{link || "Ulanmagan"}</p>
              </div>
              {link ? (
                <a className="btn sky small" href={link} target="_blank" rel="noreferrer"><Link2 size={14} /> Ochish</a>
              ) : (
                <Badge tone="red">Ulanmagan</Badge>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Tizim nazorati" subtitle="Barcha ma'lumotni nol holatga qaytarish mumkin">
        <div className="toolbar left">
          <button className="btn red" onClick={resetAll}><Trash2 size={16} /> Barchasini tozalash</button>
        </div>
      </SectionCard>
    </div>
  );
}

function Dashboard({ data }) {
  const cards = [
    { title: "Kontentlar", value: data.content.length, tone: "blue" },
    { title: "Vazifalar", value: data.tasks.length, tone: "green" },
    { title: "Kampaniyalar", value: data.ads.length, tone: "sky" },
    { title: "Hodimlar", value: data.team.length, tone: "red" },
  ];

  return (
    <div className="stack-gap">
      <div className="cards4">
        {cards.map((item) => (
          <div key={item.title} className="stat-card white">
            <div className="stat-topline">{item.title}</div>
            <div className="stat-number">{item.value}</div>
            <Badge tone={item.tone}>0 dan boshlandi</Badge>
          </div>
        ))}
      </div>

      <div className="split-grid">
        <SectionCard title="Bugungi holat" subtitle="Panel to‘liq ishlaydi, ma'lumotlarni o‘zingiz kiritasiz">
          <div className="status-list">
            <div className="status-item"><CheckCircle2 size={18} /> Login tizimi tayyor</div>
            <div className="status-item"><CheckCircle2 size={18} /> Barcha bo‘limlarda yangi qator qo‘shish ishlaydi</div>
            <div className="status-item"><CheckCircle2 size={18} /> Hodim yaratish va login berish bo‘limi tayyor</div>
            <div className="status-item"><CheckCircle2 size={18} /> Ijtimoiy tarmoqlarni ulash mumkin</div>
          </div>
        </SectionCard>

        <SectionCard title="Tezkor eslatma" subtitle="Ma'lumotlar shu brauzerda saqlanadi">
          <div className="note-box">
            <AlertCircle size={18} />
            <p>
              Bu final frontend versiya. Kiritilgan ma'lumotlar brauzerning localStorage ichida saqlanadi.
              Sahifani yopib-ochsangiz ham qoladi.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default function App() {
  const [appData, setAppData] = useState(() => loadState());
  const [active, setActive] = useState("dashboard");
  const [loggedIn, setLoggedIn] = useState(false);
  const [phone, setPhone] = useState(ADMIN_PHONE);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [loginError, setLoginError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  }, [appData]);

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return MENU;
    return MENU.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const updateSection = (key, rows) => setAppData((prev) => ({ ...prev, [key]: rows }));
  const updateSettings = (settings) => setAppData((prev) => ({ ...prev, settings }));
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
        <div className="login-box">
          <div className="login-brand">
            <div className="logo-round">a</div>
            <div>
              <h1>aloo SMM Admin</h1>
              <p>Yakuniy ishchi panel</p>
            </div>
          </div>

          <div className="login-note success">
            <ShieldCheck size={18} /> Login: <strong>{ADMIN_PHONE}</strong> &nbsp; Parol: <strong>{ADMIN_PASSWORD}</strong>
          </div>

          <form className="login-form-final" onSubmit={login}>
            <label className="field">
              <span>Telefon raqam</span>
              <div className="input-icon">
                <Phone size={16} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" />
              </div>
            </label>
            <label className="field">
              <span>Parol</span>
              <div className="input-icon">
                <Lock size={16} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Parol" />
              </div>
            </label>

            {loginError ? <div className="login-note danger"><X size={16} /> {loginError}</div> : null}

            <button className="btn blue full" type="submit">Panelga kirish</button>
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
  if (active === "settings") content = <SettingsPage settings={appData.settings} setSettings={updateSettings} resetAll={resetAll} />;

  return (
    <div className="app white-bg">
      <aside className="sidebar-white">
        <div className="sidebar-top">
          <div className="logo-round small">a</div>
          <div>
            <h2>{appData.settings.companyName || "aloo"}</h2>
            <p>{appData.settings.department || "SMM department"}</p>
          </div>
        </div>

        <div className="search-box white">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Menu qidirish" />
        </div>

        <div className="menu-list white-menu">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`menu-btn2 ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
                <span><Icon size={16} /> {item.title}</span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-bottom">
          <button className="btn red full" onClick={() => setLoggedIn(false)}><LogOut size={16} /> Chiqish</button>
        </div>
      </aside>

      <main className="main-white">
        <div className="topbar-white">
          <div>
            <h1>{MENU.find((m) => m.id === active)?.title || "Dashboard"}</h1>
            <p>Barcha ma'lumotlar 0 holatdan boshlanadi va siz qo‘lda kiritasiz</p>
          </div>
          <div className="top-actions">
            <Badge tone="blue">Ishchi panel</Badge>
            <Badge tone="green">Saqlanmoqda</Badge>
          </div>
        </div>

        {content}
      </main>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
*{box-sizing:border-box} html,body,#root{margin:0;min-height:100%;font-family:Inter,Arial,sans-serif;background:#f5f8fc;color:#123} button,input{font:inherit}
.app{display:grid;grid-template-columns:290px 1fr;min-height:100vh}.white-bg{background:#f6f9fd}
.sidebar-white{background:#fff;border-right:1px solid #e5eef8;padding:18px;display:flex;flex-direction:column;gap:16px}
.sidebar-top{display:flex;align-items:center;gap:12px;padding-bottom:8px}.sidebar-top h2{margin:0;font-size:22px}.sidebar-top p{margin:4px 0 0;color:#6e8097;font-size:13px}
.logo-round{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,#1992ff,#65d6ff);color:#fff;font-weight:900;font-size:28px;box-shadow:0 12px 24px rgba(25,146,255,.26)}.logo-round.small{width:48px;height:48px;font-size:24px}
.search-box{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;border:1px solid #d9e8f7;background:#fff}.search-box.white input{border:0;outline:0;width:100%;background:transparent}
.menu-list{display:grid;gap:10px}.menu-btn2{border:1px solid #dce9f8;background:#fff;border-radius:16px;padding:13px 14px;font-weight:700;color:#20415e;cursor:pointer;text-align:left;transition:.2s}.menu-btn2 span{display:flex;align-items:center;gap:10px}.menu-btn2.active{background:linear-gradient(135deg,#1992ff,#66d6ff);color:#fff;border-color:#1992ff;box-shadow:0 14px 28px rgba(25,146,255,.24)}
.sidebar-bottom{margin-top:auto}.main-white{padding:24px}.topbar-white{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid #e5eef8;border-radius:24px;padding:20px 22px;box-shadow:0 14px 34px rgba(28,76,124,.06)}.topbar-white h1{margin:0;font-size:34px}.topbar-white p{margin:6px 0 0;color:#6b7f95}.top-actions{display:flex;gap:10px;flex-wrap:wrap}
.card,.stat-card{background:#fff;border:1px solid #e5eef8;border-radius:24px;padding:20px;box-shadow:0 14px 34px rgba(28,76,124,.06)}.section-head{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.section-head h3{margin:0;font-size:24px}.section-head p{margin:6px 0 0;color:#6c8198}
.stack-gap{display:grid;gap:18px;margin-top:18px}.split-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.cards4{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:18px}.stat-topline{font-size:14px;color:#6c8198}.stat-number{font-size:44px;font-weight:900;margin:10px 0 12px;color:#153653}
.badge{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:800}.badge-blue{background:#e9f4ff;color:#0f75d8}.badge-green{background:#ebfff2;color:#1f9c5b}.badge-sky{background:#edf9ff;color:#0a99c0}.badge-red{background:#fff0f0;color:#d44343}
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}.toolbar.left{justify-content:flex-start}.btn{border:0;border-radius:16px;padding:12px 16px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:.2s}.btn.full{width:100%;justify-content:center}.btn.small{padding:8px 12px;border-radius:12px}.btn.blue{background:#1992ff;color:#fff;box-shadow:0 12px 24px rgba(25,146,255,.22)}.btn.green{background:#2abb73;color:#fff;box-shadow:0 12px 24px rgba(42,187,115,.2)}.btn.sky{background:#68d8ff;color:#0d4360;box-shadow:0 12px 24px rgba(104,216,255,.2)}.btn.red{background:#ef5454;color:#fff;box-shadow:0 12px 24px rgba(239,84,84,.18)}
.table-wrap{overflow:auto;border:1px solid #e7eef7;border-radius:20px}.table-wrap table{width:100%;border-collapse:collapse;min-width:840px;background:#fff}.table-wrap th,.table-wrap td{padding:12px;border-bottom:1px solid #edf2f8;text-align:left;vertical-align:top}.table-wrap th{background:#f8fbff;color:#46637f;font-size:13px}.table-wrap td input{width:100%;border:1px solid #dce9f7;background:#fff;border-radius:12px;padding:10px 12px;outline:none}.empty-cell{text-align:center;color:#6d8297;padding:24px}
.icon-btn{width:38px;height:38px;border:0;border-radius:12px;display:grid;place-items:center;cursor:pointer}.icon-btn.red{background:#fff1f1;color:#d34545}
.field{display:grid;gap:8px}.field span{font-size:13px;font-weight:700;color:#55708c}.field input{border:1px solid #dce9f7;background:#fff;border-radius:14px;padding:12px 14px;outline:none}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.form-grid.three{grid-template-columns:1fr 1fr 1fr}
.status-list{display:grid;gap:12px}.status-item{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#f8fbff;border:1px solid #e5eef8;border-radius:16px;color:#234562}.status-item svg{color:#1ea96a}.note-box{display:flex;align-items:flex-start;gap:10px;padding:16px;border-radius:18px;background:#fffaf0;border:1px solid #fde8bf;color:#7d5b17}
.social-links-preview{display:grid;gap:12px}.social-item{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:14px 16px;border:1px solid #e5eef8;border-radius:18px;background:#fbfdff}.social-item p{margin:4px 0 0;color:#6f8397;word-break:break-all}
.login-page.final-white{display:grid;place-items:center;min-height:100vh;background:linear-gradient(180deg,#f8fbff,#eef6ff)}.login-box{width:min(520px,92vw);background:#fff;border:1px solid #e5eef8;border-radius:28px;padding:28px;box-shadow:0 18px 50px rgba(25,74,123,.08)}.login-brand{display:flex;align-items:center;gap:14px;margin-bottom:16px}.login-brand h1{margin:0;font-size:30px}.login-brand p{margin:4px 0 0;color:#6e8097}
.login-note{display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:14px;margin-bottom:14px;font-size:14px}.login-note.success{background:#edf8ff;color:#0b74cf}.login-note.danger{background:#fff1f1;color:#d54545}.login-form-final{display:grid;gap:14px}.input-icon{display:flex;align-items:center;gap:10px;border:1px solid #dce9f7;border-radius:14px;padding:12px 14px}.input-icon input{border:0;outline:0;width:100%}
.editor-wrap{margin-top:18px}.white-menu{overflow:auto}.topbar-actions{display:flex;gap:8px}
@media (max-width:1100px){.app{grid-template-columns:1fr}.sidebar-white{border-right:0;border-bottom:1px solid #e5eef8}.cards4,.split-grid,.form-grid,.form-grid.three{grid-template-columns:1fr}}
`;
