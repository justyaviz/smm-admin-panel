import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  FileBarChart2,
  FolderKanban,
  Gift,
  Home,
  Image,
  LayoutGrid,
  LogOut,
  Megaphone,
  Moon,
  Search,
  Settings,
  SunMedium,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { api, clearAuth, getCurrentUser } from "./api";

const MENU = [
  { id: "dashboard", title: "Bosh sahifa", icon: Home },
  { id: "content", title: "Kontent reja", icon: LayoutGrid },
  { id: "dailyReports", title: "Kunlik filial hisobotlari", icon: FileBarChart2 },
  { id: "campaigns", title: "Reklama kampaniyalari", icon: Megaphone },
  { id: "bonus", title: "Bonus tizimi", icon: Gift },
  { id: "branches", title: "Filiallar", icon: Building2 },
  { id: "users", title: "Hodimlar", icon: Users },
  { id: "uploads", title: "Media kutubxona", icon: Image },
  { id: "tasks", title: "Vazifalar", icon: FolderKanban },
  { id: "settings", title: "Sozlamalar", icon: Settings }
];

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type || "success"}`}>
      <span>{toast.message}</span>
      <button type="button" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />}
    </button>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value ?? 0}</div>
      {subtitle ? <div className="stat-sub">{subtitle}</div> : null}
    </div>
  );
}

function LoginPage({ onLoggedIn }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setErr("");
      const data = await api.login({ phone, password });
      onLoggedIn(data.user);
    } catch (error) {
      setErr(error.message || "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="brand-pill">aloo SMM platforma</div>
        <h1>Asalomu alaykum</h1>
        <h2>aloo do‘konlar tarmog‘i SMM jamoasi yagona ma’lumotlar platformasiga xush kelibsiz</h2>
        <p>Kirish uchun login va parolingizni kiriting.</p>

        <div className="login-showcase">
          <div className="show-card phone-card">
            <div className="phone-frame">
              <div className="phone-screen">
                <div className="phone-logo">aloo</div>
              </div>
            </div>
          </div>
          <div className="show-card">
            <div className="show-title">Texno hayotga ulanish</div>
            <div className="show-text">SMM jamoasi uchun yagona boshqaruv va hisobot maydoni.</div>
          </div>
        </div>
      </div>

      <form className="login-card" onSubmit={submit}>
        <div className="login-card-top">
          <div>
            <div className="small-label">Kirish</div>
            <div className="login-title">Xush kelibsiz</div>
          </div>
          <ThemeToggle theme="light" setTheme={() => {}} />
        </div>

        <label>
          <span>Telefon raqam yoki login</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="998939000 yoki admin"
          />
        </label>

        <label>
          <span>Parol</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parol"
          />
        </label>

        {err ? <div className="error-box">{err}</div> : null}

        <button className="primary-btn" disabled={loading} type="submit">
          {loading ? "Kirilmoqda..." : "Kirish"}
        </button>
      </form>
    </div>
  );
}

function DashboardPage({ summary }) {
  return (
    <div className="page-grid">
      <div className="hero-banner">
        <div className="hero-left">
          <div className="brand-pill">Boshqaruv markazi</div>
          <h2>aloo SMM jamoasi platformasi</h2>
          <p>Kontent, filial hisobotlari, KPI, bonus, media va kampaniyalarni bitta joydan boshqaring.</p>
        </div>
        <div className="hero-right">
          <div className="glass-card">
            <div className="glass-label">Joriy holat</div>
            <div className="glass-big">{summary?.today_report_count || 0}</div>
            <div className="glass-sub">bugungi hisobot</div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Kontentlar" value={summary?.content_count || 0} subtitle="rejadagi kontentlar" />
        <StatCard title="Vazifalar" value={summary?.task_count || 0} subtitle="faol vazifalar" />
        <StatCard title="Kampaniyalar" value={summary?.campaign_count || 0} subtitle="reklama kampaniyalari" />
        <StatCard title="Hodimlar" value={summary?.user_count || 0} subtitle="faol foydalanuvchilar" />
        <StatCard title="Bugungi hisobotlar" value={summary?.today_report_count || 0} subtitle="filial hisobotlari" />
        <StatCard
          title="Jami bonus"
          value={`${Number(summary?.total_bonus_amount || 0).toLocaleString()} so‘m`}
          subtitle="umumiy bonus summasi"
        />
      </div>
    </div>
  );
}

function SimpleTablePage({ title, rows, columns }) {
  return (
    <div className="panel-card">
      <SectionTitle title={title} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((row, idx) => (
                <tr key={row.id || idx}>
                  {columns.map((c) => (
                    <td key={c.key}>{row[c.key] ?? "-"}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="empty-cell">
                  Hozircha ma’lumot yo‘q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPage({ settings, onSave, theme, setTheme, saving }) {
  const [form, setForm] = useState(settings || {});

  useEffect(() => {
    setForm(settings || {});
  }, [settings]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="page-grid">
      <div className="panel-card">
        <SectionTitle title="Ko‘rinish" subtitle="Brandbook uslubidagi rang va tema boshqaruvi" />
        <div className="toolbar-line">
          <div className="color-chip blue">#1690F5</div>
          <div className="color-chip black">#000000</div>
          <div className="color-chip white">#FFFFFF</div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </div>

      <div className="panel-card">
        <SectionTitle title="Asosiy sozlamalar" subtitle="Platforma ma’lumotlarini boshqaring" />

        <div className="form-grid">
          <label>
            <span>Kompaniya nomi</span>
            <input value={form.company_name || ""} onChange={(e) => setField("company_name", e.target.value)} />
          </label>
          <label>
            <span>Platforma nomi</span>
            <input value={form.platform_name || ""} onChange={(e) => setField("platform_name", e.target.value)} />
          </label>
          <label>
            <span>Bo‘lim</span>
            <input value={form.department_name || ""} onChange={(e) => setField("department_name", e.target.value)} />
          </label>
          <label>
            <span>Websayt</span>
            <input value={form.website_url || ""} onChange={(e) => setField("website_url", e.target.value)} />
          </label>
          <label>
            <span>Telegram</span>
            <input value={form.telegram_url || ""} onChange={(e) => setField("telegram_url", e.target.value)} />
          </label>
          <label>
            <span>Instagram</span>
            <input value={form.instagram_url || ""} onChange={(e) => setField("instagram_url", e.target.value)} />
          </label>
          <label>
            <span>YouTube</span>
            <input value={form.youtube_url || ""} onChange={(e) => setField("youtube_url", e.target.value)} />
          </label>
          <label>
            <span>Facebook</span>
            <input value={form.facebook_url || ""} onChange={(e) => setField("facebook_url", e.target.value)} />
          </label>
          <label>
            <span>TikTok</span>
            <input value={form.tiktok_url || ""} onChange={(e) => setField("tiktok_url", e.target.value)} />
          </label>
        </div>

        <button className="primary-btn mt16" onClick={() => onSave(form)} disabled={saving}>
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(getCurrentUser());
  const [active, setActive] = useState("dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("aloo_theme") || "dark");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  const [summary, setSummary] = useState(null);
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [contentRows, setContentRows] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem("aloo_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  async function reloadData() {
    try {
      const [
        dashboardRes,
        settingsRes,
        notificationsRes,
        usersRes,
        branchesRes,
        bonusRes,
        uploadsRes,
        contentRes,
        dailyReportsRes,
        campaignsRes,
        tasksRes
      ] = await Promise.all([
        api.dashboard(),
        api.settings.get(),
        api.list("notifications").catch(() => []),
        api.list("users").catch(() => []),
        api.list("branches").catch(() => []),
        api.list("bonuses").catch(() => []),
        api.list("uploads").catch(() => []),
        api.list("content").catch(() => []),
        api.list("daily-reports").catch(() => []),
        api.list("campaigns").catch(() => []),
        api.list("tasks").catch(() => [])
      ]);

      setSummary(dashboardRes);
      setSettings(settingsRes);
      setNotifications(notificationsRes || []);
      setUsers(usersRes || []);
      setBranches(branchesRes || []);
      setBonuses(bonusRes || []);
      setUploads(uploadsRes || []);
      setContentRows(contentRes || []);
      setDailyReports(dailyReportsRes || []);
      setCampaigns(campaignsRes || []);
      setTasks(tasksRes || []);
    } catch {}
  }

  useEffect(() => {
    async function init() {
      if (!user) {
        setBooting(false);
        return;
      }

      try {
        const me = await api.me();
        setUser(me.user);
        await reloadData();
      } catch {
        clearAuth();
        setUser(null);
      } finally {
        setBooting(false);
      }
    }

    init();
  }, []);

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return MENU;
    return MENU.filter((m) => m.title.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  function showSaved(message = "Saqlandi ✅", type = "success") {
    setToast({ message, type });
  }

  async function saveSettings(payload) {
    try {
      setSavingSettings(true);
      const res = await api.settings.update(payload);
      const updated = await api.settings.get();
      setSettings(updated);
      showSaved(res.message || "Saqlandi ✅");
    } catch (e) {
      showSaved(e.message || "Xatolik yuz berdi", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  function logout() {
    clearAuth();
    setUser(null);
    setSummary(null);
    setSettings(null);
    setNotifications([]);
    setUsers([]);
    setBranches([]);
    setBonuses([]);
    setUploads([]);
    setContentRows([]);
    setDailyReports([]);
    setCampaigns([]);
    setTasks([]);
    setActive("dashboard");
  }

  if (booting) {
    return <div className="loading-screen">Yuklanmoqda...</div>;
  }

  if (!user) {
    return (
      <>
        <LoginPage onLoggedIn={setUser} />
        <Toast toast={toast} onClose={() => setToast(null)} />
        <style>{styles}</style>
      </>
    );
  }

  let page = null;

  if (active === "dashboard") {
    page = <DashboardPage summary={summary} />;
  } else if (active === "content") {
    page = (
      <SimpleTablePage
        title="Kontent reja"
        rows={contentRows}
        columns={[
          { key: "title", label: "Sarlavha" },
          { key: "platform", label: "Platforma" },
          { key: "content_type", label: "Turi" },
          { key: "status", label: "Holat" },
          { key: "publish_date", label: "Sana" }
        ]}
      />
    );
  } else if (active === "branches") {
    page = (
      <SimpleTablePage
        title="Filiallar"
        rows={branches}
        columns={[
          { key: "name", label: "Filial" },
          { key: "city", label: "Shahar" },
          { key: "manager_name", label: "Manager" },
          { key: "phone", label: "Telefon" }
        ]}
      />
    );
  } else if (active === "dailyReports") {
    page = (
      <SimpleTablePage
        title="Kunlik filial hisobotlari"
        rows={dailyReports}
        columns={[
          { key: "report_date", label: "Sana" },
          { key: "branch_name", label: "Filial" },
          { key: "user_name", label: "Hodim" },
          { key: "stories_count", label: "Stories" },
          { key: "posts_count", label: "Post" },
          { key: "reels_count", label: "Reels" }
        ]}
      />
    );
  } else if (active === "campaigns") {
    page = (
      <SimpleTablePage
        title="Reklama kampaniyalari"
        rows={campaigns}
        columns={[
          { key: "title", label: "Kampaniya" },
          { key: "platform", label: "Platforma" },
          { key: "budget", label: "Byudjet" },
          { key: "spend", label: "Sarf" },
          { key: "roi", label: "ROI" },
          { key: "status", label: "Holat" }
        ]}
      />
    );
  } else if (active === "bonus") {
    page = (
      <SimpleTablePage
        title="Bonus tizimi"
        rows={bonuses}
        columns={[
          { key: "full_name", label: "Hodim" },
          { key: "month_label", label: "Oy" },
          { key: "total_units", label: "Soni" },
          { key: "unit_price", label: "Birlik narx" },
          { key: "total_amount", label: "Jami summa" }
        ]}
      />
    );
  } else if (active === "users") {
    page = (
      <SimpleTablePage
        title="Hodimlar"
        rows={users}
        columns={[
          { key: "full_name", label: "Ism" },
          { key: "phone", label: "Telefon" },
          { key: "login", label: "Login" },
          { key: "role", label: "Rol" }
        ]}
      />
    );
  } else if (active === "uploads") {
    page = (
      <SimpleTablePage
        title="Media kutubxona"
        rows={uploads}
        columns={[
          { key: "original_name", label: "Fayl" },
          { key: "mime_type", label: "Turi" },
          { key: "file_size", label: "Hajmi" },
          { key: "file_url", label: "Link" }
        ]}
      />
    );
  } else if (active === "tasks") {
    page = (
      <SimpleTablePage
        title="Vazifalar"
        rows={tasks}
        columns={[
          { key: "title", label: "Vazifa" },
          { key: "status", label: "Holat" },
          { key: "priority", label: "Muhimlik" },
          { key: "due_date", label: "Muddat" }
        ]}
      />
    );
  } else if (active === "settings") {
    page = (
      <SettingsPage
        settings={settings}
        onSave={saveSettings}
        theme={theme}
        setTheme={setTheme}
        saving={savingSettings}
      />
    );
  }

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark">a</div>
            <div>
              <div className="brand-name">aloo</div>
              <div className="brand-desc">SMM jamoasi platformasi</div>
            </div>
          </div>

          <div className="sidebar-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidiruv..."
            />
          </div>

          <div className="menu-list">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`menu-btn ${active === item.id ? "active" : ""}`}
                  onClick={() => setActive(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>

          <button type="button" className="logout-btn" onClick={logout}>
            <LogOut size={16} />
            Chiqish
          </button>
        </aside>

        <main className="main-area">
          <div className="topbar">
            <div>
              <div className="small-label">aloo platforma</div>
              <h1>{MENU.find((m) => m.id === active)?.title || "Bosh sahifa"}</h1>
            </div>

            <div className="topbar-right">
              <div className="notif-pill">
                <Bell size={16} />
                {notifications.length}
              </div>
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <div className="user-chip">
                <User size={16} />
                <span>{user.full_name}</span>
              </div>
            </div>
          </div>

          {page}
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
      <style>{styles}</style>
    </>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 2200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type || "success"}`}>
      <span>{toast.message}</span>
      <button type="button" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

const styles = `
:root{
  --blue:#1690F5;
  --black:#000000;
  --white:#FFFFFF;
  --bg:#f5f8fc;
  --panel:#ffffff;
  --panel-soft:#f2f7fd;
  --text:#0d1f38;
  --muted:#6f8397;
  --line:#dfe9f4;
  --shadow:0 18px 40px rgba(20,73,130,.08);
}
:root[data-theme='dark']{
  --blue:#1690F5;
  --black:#000000;
  --white:#FFFFFF;
  --bg:#09111d;
  --panel:#0f1826;
  --panel-soft:#121e2e;
  --text:#f4f8ff;
  --muted:#98abc0;
  --line:rgba(255,255,255,.08);
  --shadow:0 18px 40px rgba(0,0,0,.25);
}
*{box-sizing:border-box}
html,body,#root{margin:0;min-height:100%;font-family:Gilroy,Inter,Arial,sans-serif;background:var(--bg);color:var(--text)}
button,input,select{font:inherit}
input,select{outline:none}

.loading-screen{
  min-height:100vh;
  display:grid;
  place-items:center;
  background:var(--bg);
  color:var(--text);
}

.login-page{
  min-height:100vh;
  display:grid;
  grid-template-columns:1.15fr .85fr;
  gap:32px;
  padding:40px;
  background:
    radial-gradient(circle at 20% 10%, rgba(22,144,245,.14), transparent 24%),
    linear-gradient(180deg, var(--bg), var(--bg));
}
.login-left{
  display:flex;
  flex-direction:column;
  justify-content:center;
}
.login-left h1{
  margin:0;
  font-size:68px;
  line-height:1;
  font-weight:800;
}
.login-left h2{
  margin:16px 0 0;
  font-size:32px;
  line-height:1.15;
  max-width:760px;
  font-weight:700;
}
.login-left p{
  margin:18px 0 0;
  max-width:680px;
  color:var(--muted);
  font-size:18px;
  line-height:1.6;
}
.brand-pill{
  width:max-content;
  padding:10px 16px;
  border-radius:999px;
  border:1px solid rgba(22,144,245,.18);
  background:rgba(22,144,245,.08);
  color:var(--blue);
  font-size:13px;
  letter-spacing:.18em;
  text-transform:uppercase;
}
.login-showcase{
  margin-top:28px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:16px;
  max-width:720px;
}
.show-card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:28px;
  padding:22px;
  box-shadow:var(--shadow);
}
.show-title{
  font-size:20px;
  font-weight:700;
  margin-bottom:10px;
}
.show-text{
  color:var(--muted);
  line-height:1.6;
}
.phone-card{
  display:grid;
  place-items:center;
}
.phone-frame{
  width:190px;
  height:280px;
  border-radius:34px;
  background:#0d1420;
  padding:10px;
  box-shadow:0 18px 38px rgba(0,0,0,.2);
}
.phone-screen{
  width:100%;
  height:100%;
  border-radius:26px;
  background:linear-gradient(180deg,#e9f6ff,#cce9ff 35%, #1690F5);
  display:grid;
  place-items:center;
  position:relative;
  overflow:hidden;
}
.phone-screen::after{
  content:"";
  position:absolute;
  inset:18px;
  border-radius:22px;
  border:2px solid rgba(255,255,255,.35);
}
.phone-logo{
  position:relative;
  z-index:2;
  font-size:34px;
  font-weight:800;
  color:#fff;
}

.login-card{
  align-self:center;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:32px;
  padding:28px;
  box-shadow:var(--shadow);
  display:grid;
  gap:16px;
}
.login-card-top{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
}
.small-label{
  color:var(--muted);
  font-size:12px;
  letter-spacing:.18em;
  text-transform:uppercase;
}
.login-title{
  margin-top:8px;
  font-size:34px;
  font-weight:800;
}
.login-card label{
  display:grid;
  gap:8px;
}
.login-card label span{
  color:var(--muted);
  font-size:13px;
}
.login-card input{
  background:var(--panel-soft);
  border:1px solid var(--line);
  color:var(--text);
  border-radius:18px;
  padding:15px 16px;
}
.primary-btn{
  border:0;
  border-radius:18px;
  padding:15px 18px;
  cursor:pointer;
  font-weight:800;
  color:#fff;
  background:linear-gradient(135deg, #1690F5, #54c5ff);
  box-shadow:0 16px 30px rgba(22,144,245,.22);
}
.primary-btn:hover{
  transform:translateY(-1px);
}
.error-box{
  background:rgba(239,90,90,.1);
  color:#d94f4f;
  border:1px solid rgba(239,90,90,.18);
  padding:12px 14px;
  border-radius:14px;
}

.app-shell{
  min-height:100vh;
  display:grid;
  grid-template-columns:290px 1fr;
  background:var(--bg);
}
.sidebar{
  background:var(--panel);
  border-right:1px solid var(--line);
  padding:18px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.brand-block{
  display:flex;
  align-items:center;
  gap:12px;
}
.brand-mark{
  width:52px;
  height:52px;
  border-radius:18px;
  background:linear-gradient(135deg,#1690F5,#72d8ff);
  color:#fff;
  display:grid;
  place-items:center;
  font-weight:900;
  font-size:26px;
}
.brand-name{
  font-size:24px;
  font-weight:800;
}
.brand-desc{
  font-size:12px;
  color:var(--muted);
}
.sidebar-search{
  display:flex;
  align-items:center;
  gap:10px;
  background:var(--panel-soft);
  border:1px solid var(--line);
  border-radius:16px;
  padding:12px 14px;
}
.sidebar-search input{
  width:100%;
  border:0;
  background:transparent;
  color:var(--text);
}
.menu-list{
  display:grid;
  gap:10px;
}
.menu-btn{
  border:1px solid transparent;
  background:transparent;
  color:var(--text);
  padding:14px 16px;
  border-radius:18px;
  text-align:left;
  display:flex;
  align-items:center;
  gap:10px;
  cursor:pointer;
  font-weight:700;
}
.menu-btn:hover{
  background:var(--panel-soft);
}
.menu-btn.active{
  background:linear-gradient(135deg, rgba(22,144,245,.14), rgba(84,197,255,.12));
  border-color:rgba(22,144,245,.18);
}
.logout-btn{
  margin-top:auto;
  border:0;
  border-radius:18px;
  padding:14px 16px;
  background:#111;
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  cursor:pointer;
}
.main-area{
  padding:24px;
}
.topbar{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:28px;
  padding:20px 22px;
  display:flex;
  justify-content:space-between;
  gap:18px;
  align-items:center;
  flex-wrap:wrap;
  box-shadow:var(--shadow);
}
.topbar h1{
  margin:8px 0 0;
  font-size:36px;
}
.topbar-right{
  display:flex;
  gap:10px;
  align-items:center;
  flex-wrap:wrap;
}
.theme-toggle,
.notif-pill,
.user-chip{
  border:1px solid var(--line);
  background:var(--panel-soft);
  color:var(--text);
  border-radius:16px;
  padding:12px 14px;
  display:flex;
  align-items:center;
  gap:8px;
}
.page-grid{
  display:grid;
  gap:18px;
  margin-top:18px;
}
.hero-banner{
  background:
    linear-gradient(90deg, rgba(22,144,245,.1), rgba(255,255,255,0) 45%),
    var(--panel);
  border:1px solid var(--line);
  border-radius:30px;
  padding:28px;
  display:grid;
  grid-template-columns:1.2fr .8fr;
  gap:20px;
  box-shadow:var(--shadow);
}
.hero-banner h2{
  margin:14px 0 10px;
  font-size:52px;
  line-height:1.02;
}
.hero-banner p{
  margin:0;
  color:var(--muted);
  font-size:18px;
  line-height:1.6;
}
.hero-right{
  display:flex;
  justify-content:flex-end;
  align-items:center;
}
.glass-card{
  min-width:220px;
  padding:22px;
  border-radius:24px;
  background:linear-gradient(180deg, rgba(22,144,245,.16), rgba(255,255,255,.06));
  border:1px solid rgba(22,144,245,.2);
}
.glass-label{
  font-size:13px;
  color:var(--muted);
}
.glass-big{
  font-size:46px;
  font-weight:900;
  margin-top:8px;
}
.glass-sub{
  color:var(--muted);
  margin-top:6px;
}
.stats-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:18px;
}
.stat-card,
.panel-card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:22px;
  box-shadow:var(--shadow);
}
.stat-title{
  color:var(--muted);
  font-size:14px;
}
.stat-value{
  font-size:40px;
  font-weight:900;
  margin-top:10px;
}
.stat-sub{
  margin-top:8px;
  color:var(--muted);
}
.section-head h2{
  margin:0;
  font-size:28px;
}
.section-head p{
  margin:8px 0 0;
  color:var(--muted);
}
.toolbar-line{
  display:flex;
  gap:10px;
  align-items:center;
  flex-wrap:wrap;
}
.color-chip{
  padding:10px 14px;
  border-radius:999px;
  font-weight:700;
  border:1px solid var(--line);
}
.color-chip.blue{background:rgba(22,144,245,.1); color:#1690F5}
.color-chip.black{background:#111; color:#fff}
.color-chip.white{background:#fff; color:#111}
.form-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:14px;
}
.form-grid label{
  display:grid;
  gap:8px;
}
.form-grid label span{
  color:var(--muted);
  font-size:13px;
}
.form-grid input{
  background:var(--panel-soft);
  border:1px solid var(--line);
  color:var(--text);
  border-radius:16px;
  padding:14px 15px;
}
.mt16{margin-top:16px}
.table-wrap{
  overflow:auto;
  border:1px solid var(--line);
  border-radius:18px;
}
table{
  width:100%;
  border-collapse:collapse;
}
th,td{
  padding:13px 14px;
  border-bottom:1px solid var(--line);
  text-align:left;
}
th{
  color:var(--muted);
  background:rgba(22,144,245,.05);
}
.empty-cell{
  text-align:center;
  color:var(--muted);
  padding:24px;
}
.toast{
  position:fixed;
  right:20px;
  bottom:20px;
  min-width:220px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  border-radius:16px;
  color:#fff;
  padding:14px 16px;
  z-index:9999;
  box-shadow:0 18px 34px rgba(0,0,0,.2);
}
.toast-success{background:linear-gradient(135deg,#1fbe73,#57e0a1)}
.toast-error{background:linear-gradient(135deg,#ef5a5a,#ff9999)}
.toast button{
  background:transparent;
  border:0;
  color:#fff;
  cursor:pointer;
}

@media (max-width: 1180px){
  .login-page,
  .app-shell,
  .hero-banner,
  .stats-grid,
  .form-grid{
    grid-template-columns:1fr;
  }
  .main-area{padding:14px}
  .topbar h1{font-size:28px}
  .hero-banner h2{font-size:38px}
  .login-left h1{font-size:48px}
  .login-left h2{font-size:24px}
}
`;
