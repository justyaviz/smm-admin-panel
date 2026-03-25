import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
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
  ShieldCheck,
  CircleDollarSign,
  Activity,
  Layers3,
  CheckCircle2,
  Clock3,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { api, clearAuth, getCurrentUser } from "./api";

const BRAND = {
  blue: "#1690F5",
  blueSoft: "#EAF5FF",
  black: "#101010",
  white: "#FFFFFF",
};

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
  { id: "settings", title: "Sozlamalar", icon: Settings },
];

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

function ThemeToggle({ theme, setTheme }) {
  return (
    <button className="theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />}
    </button>
  );
}

function SectionHead({ label, title, description, right }) {
  return (
    <div className="section-head">
      <div>
        {label ? <div className="section-label">{label}</div> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {right}
    </div>
  );
}

function StatCard({ icon: Icon, title, value, note, accent = "blue" }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon ${accent}`}>
          <Icon size={17} />
        </div>
        <div className="stat-chip">Jonli</div>
      </div>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

function TableCard({ title, rows, columns }) {
  return (
    <div className="card table-card">
      <SectionHead title={title} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((row, idx) => (
                <tr key={row.id || idx}>
                  {columns.map((col) => (
                    <td key={col.key}>{row[col.key] ?? "-"}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-cell" colSpan={columns.length}>
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

function Hero({ summary }) {
  return (
    <div className="hero-shell card fade-up">
      <div className="hero-left">
        <div className="hero-badge"><Sparkles size={14} /> aloo SMM platformasi</div>
        <h1>aloo do‘konlar tarmog‘i SMM jamoasi yagona ma’lumotlar platformasi</h1>
        <p>
          Kontent reja, filial hisobotlari, KPI, bonus, media va reklama kampaniyalarini bitta joydan boshqaring.
        </p>
        <div className="hero-actions">
          <button className="btn primary">Hisobot yaratish</button>
          <button className="btn secondary">Media yuklash</button>
        </div>
      </div>
      <div className="hero-right">
        <div className="hero-panel panel-dark">
          <div className="mini-title">Bugungi hisobotlar</div>
          <div className="panel-big">{summary?.today_report_count || 0}</div>
          <div className="mini-note">filiallardan kiritilgan hisobot</div>
        </div>
        <div className="hero-panel panel-blue">
          <div className="mini-title">Jami bonus</div>
          <div className="panel-big">{Number(summary?.total_bonus_amount || 0).toLocaleString()}</div>
          <div className="mini-note">so‘m</div>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLoggedIn, theme, setTheme }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const data = await api.login({ phone, password });
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message || "Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-showcase fade-up">
        <div className="brand-kicker">aloo • texno hayotga ulanish</div>
        <h1>Asalomu alaykum</h1>
        <h2>aloo do‘konlar tarmog‘i SMM jamoasi yagona ma’lumotlar platformasiga xush kelibsiz</h2>
        <p>Kirish uchun login va parolingizni kiriting.</p>

        <div className="showcase-row">
          <div className="showcase-card phone-demo">
            <div className="phone-mock">
              <div className="phone-notch" />
              <div className="phone-screen">aloo</div>
            </div>
          </div>
          <div className="showcase-card black-card">
            <div className="small-caption">Yagona platforma</div>
            <div className="big-caption">Kontent, bonus, KPI va filial hisobotlari bir joyda</div>
          </div>
        </div>
      </div>

      <form className="login-card fade-up delay-2" onSubmit={submit}>
        <div className="login-top">
          <div>
            <div className="small-label">Kirish</div>
            <div className="login-title">Xush kelibsiz</div>
          </div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>

        <label>
          <span>Telefon raqam yoki login</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="998939000 yoki admin" />
        </label>

        <label>
          <span>Parol</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Parol" />
        </label>

        {error ? <div className="error-box">{error}</div> : null}

        <button type="submit" className="btn primary large" disabled={loading}>
          {loading ? "Kirilmoqda..." : "Kirish"}
        </button>
      </form>
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
      <div className="card">
        <SectionHead
          label="Brandbook"
          title="Ko‘rinish va ranglar"
          description="aloo brend qoidalariga mos ranglar va vizual uslub"
          right={<ThemeToggle theme={theme} setTheme={setTheme} />}
        />
        <div className="chips-row">
          <span className="color-pill blue">#1690F5</span>
          <span className="color-pill black">#101010</span>
          <span className="color-pill white">#FFFFFF</span>
        </div>
      </div>

      <div className="card">
        <SectionHead title="Asosiy sozlamalar" description="Platforma ma’lumotlarini yangilang" />
        <div className="form-grid">
          <label><span>Kompaniya nomi</span><input value={form.company_name || ""} onChange={(e) => setField("company_name", e.target.value)} /></label>
          <label><span>Platforma nomi</span><input value={form.platform_name || ""} onChange={(e) => setField("platform_name", e.target.value)} /></label>
          <label><span>Bo‘lim</span><input value={form.department_name || ""} onChange={(e) => setField("department_name", e.target.value)} /></label>
          <label><span>Websayt</span><input value={form.website_url || ""} onChange={(e) => setField("website_url", e.target.value)} /></label>
          <label><span>Telegram</span><input value={form.telegram_url || ""} onChange={(e) => setField("telegram_url", e.target.value)} /></label>
          <label><span>Instagram</span><input value={form.instagram_url || ""} onChange={(e) => setField("instagram_url", e.target.value)} /></label>
          <label><span>YouTube</span><input value={form.youtube_url || ""} onChange={(e) => setField("youtube_url", e.target.value)} /></label>
          <label><span>Facebook</span><input value={form.facebook_url || ""} onChange={(e) => setField("facebook_url", e.target.value)} /></label>
          <label><span>TikTok</span><input value={form.tiktok_url || ""} onChange={(e) => setField("tiktok_url", e.target.value)} /></label>
        </div>
        <button className="btn primary mt16" onClick={() => onSave(form)} disabled={saving}>
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
  const [theme, setTheme] = useState(localStorage.getItem("aloo_theme") || "light");
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
        tasksRes,
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
        api.list("tasks").catch(() => []),
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
    return MENU.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  function showToast(message = "Saqlandi ✅", type = "success") {
    setToast({ message, type });
  }

  async function saveSettings(payload) {
    try {
      setSavingSettings(true);
      const res = await api.settings.update(payload);
      const updated = await api.settings.get();
      setSettings(updated);
      showToast(res.message || "Saqlandi ✅");
    } catch (e) {
      showToast(e.message || "Xatolik yuz berdi", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  function logout() {
    clearAuth();
    setUser(null);
    setActive("dashboard");
  }

  if (booting) return <div className="loading-screen">Yuklanmoqda...</div>;

  if (!user) {
    return (
      <>
        <LoginPage onLoggedIn={setUser} theme={theme} setTheme={setTheme} />
        <Toast toast={toast} onClose={() => setToast(null)} />
        <style>{styles}</style>
      </>
    );
  }

  let page = null;
  if (active === "dashboard") {
    page = (
      <div className="page-grid">
        <Hero summary={summary} />
        <div className="stats-grid">
          <StatCard icon={LayoutGrid} title="Kontentlar" value={summary?.content_count || 0} note="rejadagi kontentlar" />
          <StatCard icon={FolderKanban} title="Vazifalar" value={summary?.task_count || 0} note="faol vazifalar" accent="dark" />
          <StatCard icon={Megaphone} title="Kampaniyalar" value={summary?.campaign_count || 0} note="reklama kampaniyalari" />
          <StatCard icon={Users} title="Hodimlar" value={summary?.user_count || 0} note="faol foydalanuvchilar" accent="dark" />
        </div>
        <div className="dashboard-grid">
          <TableCard
            title="So‘nggi filial hisobotlari"
            rows={dailyReports.slice(0, 5)}
            columns={[
              { key: "report_date", label: "Sana" },
              { key: "branch_name", label: "Filial" },
              { key: "stories_count", label: "Stories" },
              { key: "posts_count", label: "Post" },
              { key: "reels_count", label: "Reels" },
            ]}
          />
          <div className="card side-stack">
            <SectionHead title="Tezkor holat" description="Joriy bloklar" />
            <div className="mini-stat"><CircleDollarSign size={16} /> Oylik bonus: <strong>{Number(summary?.total_bonus_amount || 0).toLocaleString()} so‘m</strong></div>
            <div className="mini-stat"><Activity size={16} /> Bugungi hisobot: <strong>{summary?.today_report_count || 0}</strong></div>
            <div className="mini-stat"><Clock3 size={16} /> Kechikkan vazifalar: <strong>{tasks.filter((t) => t.status !== "done").length}</strong></div>
            <div className="mini-stat"><CheckCircle2 size={16} /> Bildirishnomalar: <strong>{notifications.length}</strong></div>
          </div>
        </div>
      </div>
    );
  } else if (active === "content") {
    page = <TableCard title="Kontent reja" rows={contentRows} columns={[{ key: "title", label: "Sarlavha" }, { key: "platform", label: "Platforma" }, { key: "content_type", label: "Turi" }, { key: "status", label: "Holat" }, { key: "publish_date", label: "Sana" }]} />;
  } else if (active === "dailyReports") {
    page = <TableCard title="Kunlik filial hisobotlari" rows={dailyReports} columns={[{ key: "report_date", label: "Sana" }, { key: "branch_name", label: "Filial" }, { key: "user_name", label: "Hodim" }, { key: "stories_count", label: "Stories" }, { key: "posts_count", label: "Post" }, { key: "reels_count", label: "Reels" }]} />;
  } else if (active === "campaigns") {
    page = <TableCard title="Reklama kampaniyalari" rows={campaigns} columns={[{ key: "title", label: "Kampaniya" }, { key: "platform", label: "Platforma" }, { key: "budget", label: "Byudjet" }, { key: "spend", label: "Sarf" }, { key: "roi", label: "ROI" }, { key: "status", label: "Holat" }]} />;
  } else if (active === "bonus") {
    page = <TableCard title="Bonus tizimi" rows={bonuses} columns={[{ key: "full_name", label: "Hodim" }, { key: "month_label", label: "Oy" }, { key: "total_units", label: "Soni" }, { key: "unit_price", label: "Birlik narx" }, { key: "total_amount", label: "Jami summa" }]} />;
  } else if (active === "branches") {
    page = <TableCard title="Filiallar" rows={branches} columns={[{ key: "name", label: "Filial" }, { key: "city", label: "Shahar" }, { key: "manager_name", label: "Manager" }, { key: "phone", label: "Telefon" }]} />;
  } else if (active === "users") {
    page = <TableCard title="Hodimlar" rows={users} columns={[{ key: "full_name", label: "Ism" }, { key: "phone", label: "Telefon" }, { key: "login", label: "Login" }, { key: "role", label: "Rol" }]} />;
  } else if (active === "uploads") {
    page = <TableCard title="Media kutubxona" rows={uploads} columns={[{ key: "original_name", label: "Fayl" }, { key: "mime_type", label: "Turi" }, { key: "file_size", label: "Hajmi" }, { key: "file_url", label: "Link" }]} />;
  } else if (active === "tasks") {
    page = <TableCard title="Vazifalar" rows={tasks} columns={[{ key: "title", label: "Vazifa" }, { key: "status", label: "Holat" }, { key: "priority", label: "Muhimlik" }, { key: "due_date", label: "Muddat" }]} />;
  } else if (active === "settings") {
    page = <SettingsPage settings={settings} onSave={saveSettings} theme={theme} setTheme={setTheme} saving={savingSettings} />;
  }

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar fade-side">
          <div className="brand-block">
            <div className="brand-mark">a</div>
            <div>
              <div className="brand-name">aloo</div>
              <div className="brand-desc">SMM jamoasi platformasi</div>
            </div>
          </div>

          <div className="sidebar-search">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidiruv..." />
          </div>

          <div className="menu-list">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" className={`menu-btn ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
                  <Icon size={16} />
                  <span>{item.title}</span>
                  <ChevronRight size={14} className="menu-arrow" />
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
          <div className="topbar fade-up">
            <div>
              <div className="small-label">aloo platforma</div>
              <h1>{MENU.find((m) => m.id === active)?.title || "Bosh sahifa"}</h1>
            </div>
            <div className="topbar-right">
              <div className="notif-pill"><Bell size={16} /> {notifications.length}</div>
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <div className="user-chip"><User size={16} /> <span>{user.full_name}</span></div>
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

const styles = `
:root{
  --blue:#1690F5;
  --blueSoft:#EAF5FF;
  --black:#101010;
  --white:#FFFFFF;
  --bg:#F5F8FC;
  --panel:#FFFFFF;
  --panelSoft:#F7FAFE;
  --text:#0E1D35;
  --muted:#70839A;
  --line:#DEE7F0;
  --shadow:0 16px 36px rgba(24,67,112,.08);
}
:root[data-theme='dark']{
  --blue:#1690F5;
  --blueSoft:#10263D;
  --black:#0A0F14;
  --white:#FFFFFF;
  --bg:#09111C;
  --panel:#101B29;
  --panelSoft:#142132;
  --text:#F4F8FF;
  --muted:#95A9C0;
  --line:rgba(255,255,255,.08);
  --shadow:0 16px 36px rgba(0,0,0,.28);
}
*{box-sizing:border-box}
html,body,#root{margin:0;min-height:100%;font-family:Inter,Arial,sans-serif;background:var(--bg);color:var(--text)}
button,input,select{font:inherit}
input,select{outline:none}
.loading-screen{min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text)}

.login-page{min-height:100vh;display:grid;grid-template-columns:1.12fr .88fr;gap:32px;padding:40px;background:radial-gradient(circle at 20% 15%, rgba(22,144,245,.12), transparent 25%), var(--bg)}
.login-showcase{display:flex;flex-direction:column;justify-content:center}
.brand-kicker{display:inline-flex;width:max-content;padding:10px 16px;border-radius:999px;background:rgba(22,144,245,.08);border:1px solid rgba(22,144,245,.16);color:var(--blue);font-size:12px;letter-spacing:.18em;text-transform:uppercase}
.login-showcase h1{margin:18px 0 0;font-size:68px;line-height:1;font-weight:800}
.login-showcase h2{margin:14px 0 0;font-size:32px;line-height:1.18;max-width:760px}
.login-showcase p{margin:18px 0 0;color:var(--muted);font-size:18px;line-height:1.65;max-width:700px}
.showcase-row{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:760px}
.showcase-card{background:var(--panel);border:1px solid var(--line);border-radius:30px;padding:22px;box-shadow:var(--shadow)}
.black-card{background:linear-gradient(180deg,#151515,#0d0d0d);color:#fff;border-color:rgba(255,255,255,.06)}
.small-caption{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#9ccfff}
.big-caption{font-size:24px;font-weight:800;line-height:1.25;margin-top:12px}
.phone-demo{display:grid;place-items:center}
.phone-mock{width:195px;height:290px;padding:10px;border-radius:34px;background:#0c1118;box-shadow:0 18px 38px rgba(0,0,0,.22)}
.phone-notch{width:82px;height:18px;background:#121a23;border-radius:0 0 14px 14px;margin:0 auto}
.phone-screen{margin-top:8px;width:100%;height:245px;border-radius:26px;background:linear-gradient(180deg,#f6fbff,#d9eeff 45%, #1690F5);display:grid;place-items:center;color:#fff;font-size:34px;font-weight:900}
.login-card{align-self:center;background:var(--panel);border:1px solid var(--line);border-radius:32px;padding:28px;box-shadow:var(--shadow);display:grid;gap:16px}
.login-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.small-label{color:var(--muted);font-size:12px;letter-spacing:.18em;text-transform:uppercase}
.login-title{font-size:34px;font-weight:800;margin-top:8px}
.login-card label{display:grid;gap:8px}.login-card label span{font-size:13px;color:var(--muted)}
.login-card input{background:var(--panelSoft);border:1px solid var(--line);border-radius:18px;padding:15px 16px;color:var(--text)}

.app-shell{min-height:100vh;display:grid;grid-template-columns:290px 1fr;background:var(--bg)}
.sidebar{background:var(--panel);border-right:1px solid var(--line);padding:18px;display:flex;flex-direction:column;gap:16px}
.brand-block{display:flex;align-items:center;gap:12px}.brand-mark{width:54px;height:54px;border-radius:18px;background:linear-gradient(135deg,#1690F5,#71D5FF);display:grid;place-items:center;color:#fff;font-size:28px;font-weight:900}
.brand-name{font-size:24px;font-weight:800}.brand-desc{font-size:12px;color:var(--muted)}
.sidebar-search{display:flex;align-items:center;gap:10px;background:var(--panelSoft);border:1px solid var(--line);border-radius:16px;padding:12px 14px}.sidebar-search input{width:100%;border:0;background:transparent;color:var(--text)}
.menu-list{display:grid;gap:10px}.menu-btn{border:1px solid transparent;background:transparent;color:var(--text);padding:14px 16px;border-radius:18px;display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:700;text-align:left}.menu-btn:hover{background:var(--panelSoft)}.menu-btn.active{background:linear-gradient(135deg,rgba(22,144,245,.12),rgba(84,197,255,.10));border-color:rgba(22,144,245,.14)}.menu-arrow{margin-left:auto;color:var(--muted)}
.logout-btn{margin-top:auto;border:0;border-radius:18px;padding:14px 16px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer}

.main-area{padding:24px}
.topbar{background:var(--panel);border:1px solid var(--line);border-radius:30px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;box-shadow:var(--shadow)}
.topbar h1{margin:8px 0 0;font-size:36px}.topbar-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.theme-toggle,.notif-pill,.user-chip{border:1px solid var(--line);background:var(--panelSoft);color:var(--text);border-radius:16px;padding:12px 14px;display:flex;align-items:center;gap:8px}

.page-grid{display:grid;gap:18px;margin-top:18px}
.card,.stat-card{background:var(--panel);border:1px solid var(--line);border-radius:26px;padding:22px;box-shadow:var(--shadow)}
.hero-shell{display:grid;grid-template-columns:1.15fr .85fr;gap:20px;position:relative;overflow:hidden;background:linear-gradient(90deg, rgba(22,144,245,.08), transparent 40%), var(--panel)}
.hero-badge{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:rgba(22,144,245,.08);border:1px solid rgba(22,144,245,.16);color:var(--blue);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.hero-left h1{margin:16px 0 10px;font-size:52px;line-height:1.03;max-width:760px}.hero-left p{margin:0;color:var(--muted);font-size:18px;line-height:1.65;max-width:720px}
.hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}
.btn{border:0;border-radius:18px;padding:14px 18px;font-weight:800;cursor:pointer;transition:.2s}.btn:hover{transform:translateY(-1px)}.btn.primary{background:linear-gradient(135deg,#1690F5,#5BCBFF);color:#fff;box-shadow:0 14px 30px rgba(22,144,245,.22)}.btn.secondary{background:var(--panelSoft);border:1px solid var(--line);color:var(--text)}.btn.large{padding:16px 18px}.mt16{margin-top:16px}
.hero-right{display:grid;gap:16px;align-content:center}.hero-panel{border-radius:24px;padding:22px}.panel-dark{background:linear-gradient(180deg,#151515,#0d0d0d);color:#fff}.panel-blue{background:linear-gradient(135deg,#1690F5,#7AE0FF);color:#fff}.mini-title{font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.86}.panel-big{font-size:44px;font-weight:900;margin-top:10px}.mini-note{margin-top:8px;opacity:.82}

.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.stat-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.stat-icon{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#1690F5,#6FD5FF)}.stat-icon.dark{background:linear-gradient(135deg,#151515,#4b4b4b)}.stat-chip{font-size:12px;padding:8px 10px;border-radius:999px;background:rgba(22,144,245,.08);color:var(--blue);font-weight:700}.stat-title{margin-top:14px;color:var(--muted);font-size:14px}.stat-value{margin-top:10px;font-size:40px;font-weight:900;line-height:1.1}.stat-note{margin-top:8px;color:var(--muted);font-size:13px}
.section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px}.section-head h2{margin:6px 0 0;font-size:28px}.section-head p{margin:8px 0 0;color:var(--muted)}.section-label{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--blue);font-weight:700}
.dashboard-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:18px}.side-stack{display:grid;gap:14px}.mini-stat{display:flex;align-items:center;gap:10px;padding:14px 16px;border:1px solid var(--line);background:var(--panelSoft);border-radius:18px}.mini-stat strong{margin-left:auto}
.chips-row{display:flex;gap:10px;flex-wrap:wrap}.color-pill{padding:10px 14px;border-radius:999px;font-weight:700;border:1px solid var(--line)}.color-pill.blue{background:rgba(22,144,245,.08);color:#1690F5}.color-pill.black{background:#111;color:#fff}.color-pill.white{background:#fff;color:#111}
.form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.form-grid label{display:grid;gap:8px}.form-grid label span{font-size:13px;color:var(--muted)}.form-grid input{background:var(--panelSoft);border:1px solid var(--line);border-radius:16px;padding:14px 15px;color:var(--text)}
.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:18px}table{width:100%;border-collapse:collapse}th,td{padding:13px 14px;border-bottom:1px solid var(--line);text-align:left}th{background:rgba(22,144,245,.05);color:var(--muted);font-weight:700}.empty-cell{text-align:center;color:var(--muted);padding:24px}
.error-box{background:rgba(239,90,90,.1);border:1px solid rgba(239,90,90,.18);border-radius:14px;padding:12px 14px;color:#d94f4f}
.toast{position:fixed;right:20px;bottom:20px;min-width:220px;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;border-radius:16px;color:#fff;z-index:9999;box-shadow:0 18px 34px rgba(0,0,0,.2)}.toast-success{background:linear-gradient(135deg,#1FBE73,#57E0A1)}.toast-error{background:linear-gradient(135deg,#EF5A5A,#FF9B9B)}.toast button{background:transparent;border:0;color:#fff;cursor:pointer}
.fade-up{animation:fadeUp .45s ease both}.delay-2{animation-delay:.12s}.fade-side{animation:fadeSide .45s ease both}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeSide{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@media (max-width:1200px){.login-page,.app-shell,.hero-shell,.stats-grid,.dashboard-grid,.form-grid{grid-template-columns:1fr}.main-area{padding:14px}.topbar h1{font-size:28px}.hero-left h1{font-size:38px}.login-showcase h1{font-size:48px}.login-showcase h2{font-size:24px}.showcase-row{grid-template-columns:1fr}}
`;
