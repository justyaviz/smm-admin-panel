import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Gift,
  Home,
  LogOut,
  Moon,
  Search,
  Settings,
  SunMedium,
  Upload,
  User,
  Users,
  X
} from "lucide-react";
import { api, clearAuth, getCurrentUser } from "./api";

const MENU = [
  { id: "dashboard", title: "Bosh sahifa", icon: Home },
  { id: "content", title: "Kontent reja", icon: ClipboardList },
  { id: "branches", title: "Filiallar", icon: Building2 },
  { id: "dailyReports", title: "Kunlik filial hisobotlari", icon: Building2 },
  { id: "bonus", title: "Bonus tizimi", icon: Gift },
  { id: "users", title: "Hodimlar", icon: Users },
  { id: "uploads", title: "Media kutubxona", icon: Upload },
  { id: "settings", title: "Sozlamalar", icon: Settings }
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
    <button
      className="theme-toggle"
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
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
        <div className="mini-badge">aloo SMM platforma</div>
        <h1>Asalomu alaykum</h1>
        <h2>aloo do‘konlar tarmog‘i SMM jamoasi yagona ma’lumotlar platformasiga xush kelibsiz</h2>
        <p>Kirish uchun login va parolingizni kiriting.</p>
      </div>

      <form className="login-card" onSubmit={submit}>
        <div className="login-title">Tizimga kirish</div>

        <label>
          <span>Telefon raqam</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="998939000"
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

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value ?? 0}</div>
    </div>
  );
}

function DashboardPage({ summary }) {
  return (
    <div className="page-grid">
      <div className="hero-card">
        <div>
          <div className="mini-badge">Boshqaruv markazi</div>
          <h3>SMM jamoasi joriy ko‘rsatkichlari</h3>
          <p>Bu yerda umumiy hisobot, bonus va faol jarayonlar ko‘rinadi.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Kontentlar" value={summary?.content_count || 0} />
        <StatCard title="Vazifalar" value={summary?.task_count || 0} />
        <StatCard title="Kampaniyalar" value={summary?.campaign_count || 0} />
        <StatCard title="Hodimlar" value={summary?.user_count || 0} />
        <StatCard title="Bugungi hisobotlar" value={summary?.today_report_count || 0} />
        <StatCard title="Jami bonus" value={summary?.total_bonus_amount || 0} />
      </div>
    </div>
  );
}

function SettingsPage({ settings, onSave, theme, setTheme, saving }) {
  const [form, setForm] = useState(settings || {});

  useEffect(() => {
    setForm(settings || {});
  }, [settings]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="page-grid">
      <div className="panel-card">
        <div className="section-title">Ko‘rinish</div>
        <div className="row between">
          <div>
            <strong>Theme</strong>
            <p className="muted">Tizim ko‘rinishini almashtirish</p>
          </div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </div>

      <div className="panel-card">
        <div className="section-title">Asosiy sozlamalar</div>

        <div className="form-grid">
          <label>
            <span>Kompaniya nomi</span>
            <input
              value={form.company_name || ""}
              onChange={(e) => setField("company_name", e.target.value)}
            />
          </label>

          <label>
            <span>Platforma nomi</span>
            <input
              value={form.platform_name || ""}
              onChange={(e) => setField("platform_name", e.target.value)}
            />
          </label>

          <label>
            <span>Bo‘lim</span>
            <input
              value={form.department_name || ""}
              onChange={(e) => setField("department_name", e.target.value)}
            />
          </label>

          <label>
            <span>Websayt</span>
            <input
              value={form.website_url || ""}
              onChange={(e) => setField("website_url", e.target.value)}
            />
          </label>

          <label>
            <span>Telegram</span>
            <input
              value={form.telegram_url || ""}
              onChange={(e) => setField("telegram_url", e.target.value)}
            />
          </label>

          <label>
            <span>Instagram</span>
            <input
              value={form.instagram_url || ""}
              onChange={(e) => setField("instagram_url", e.target.value)}
            />
          </label>

          <label>
            <span>YouTube</span>
            <input
              value={form.youtube_url || ""}
              onChange={(e) => setField("youtube_url", e.target.value)}
            />
          </label>

          <label>
            <span>Facebook</span>
            <input
              value={form.facebook_url || ""}
              onChange={(e) => setField("facebook_url", e.target.value)}
            />
          </label>

          <label>
            <span>TikTok</span>
            <input
              value={form.tiktok_url || ""}
              onChange={(e) => setField("tiktok_url", e.target.value)}
            />
          </label>
        </div>

        <button className="primary-btn mt16" onClick={() => onSave(form)} disabled={saving}>
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </div>
  );
}

function SimpleTablePage({ title, rows, columns }) {
  return (
    <div className="panel-card">
      <div className="section-title">{title}</div>
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

function DailyReportsPage({ rows, branches, users, onSaved, reload }) {
  const [form, setForm] = useState({
    report_date: "",
    branch_id: "",
    user_id: "",
    stories_count: 0,
    posts_count: 0,
    reels_count: 0,
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("daily-reports", form);
      setForm({
        report_date: "",
        branch_id: "",
        user_id: "",
        stories_count: 0,
        posts_count: 0,
        reels_count: 0,
        notes: ""
      });
      onSaved("Saqlandi ✅");
      await reload();
    } catch (e2) {
      onSaved(e2.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="panel-card">
        <div className="section-title">Kunlik filial hisobotini kiritish</div>

        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Sana</span>
            <input
              type="date"
              value={form.report_date}
              onChange={(e) => setField("report_date", e.target.value)}
              required
            />
          </label>

          <label>
            <span>Filial</span>
            <select
              value={form.branch_id}
              onChange={(e) => setField("branch_id", e.target.value)}
              required
            >
              <option value="">Tanlang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Hodim</span>
            <select
              value={form.user_id}
              onChange={(e) => setField("user_id", e.target.value)}
            >
              <option value="">Tanlang</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Stories soni</span>
            <input
              type="number"
              min="0"
              value={form.stories_count}
              onChange={(e) => setField("stories_count", Number(e.target.value))}
            />
          </label>

          <label>
            <span>Post soni</span>
            <input
              type="number"
              min="0"
              value={form.posts_count}
              onChange={(e) => setField("posts_count", Number(e.target.value))}
            />
          </label>

          <label>
            <span>Reels soni</span>
            <input
              type="number"
              min="0"
              value={form.reels_count}
              onChange={(e) => setField("reels_count", Number(e.target.value))}
            />
          </label>

          <label className="full-col">
            <span>Izoh</span>
            <input
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Izoh"
            />
          </label>

          <button className="primary-btn" disabled={saving} type="submit">
            {saving ? "Saqlanmoqda..." : "Hisobotni saqlash"}
          </button>
        </form>
      </div>

      <SimpleTablePage
        title="Kiritilgan kunlik hisobotlar"
        rows={rows}
        columns={[
          { key: "report_date", label: "Sana" },
          { key: "branch_name", label: "Filial" },
          { key: "user_name", label: "Hodim" },
          { key: "stories_count", label: "Stories" },
          { key: "posts_count", label: "Post" },
          { key: "reels_count", label: "Reels" },
          { key: "notes", label: "Izoh" }
        ]}
      />
    </div>
  );
}

function BonusPage({ bonuses, users, branches, onSaved, reload }) {
  const [form, setForm] = useState({
    user_id: "",
    month_label: "",
    work_date: "",
    branch_id: "",
    content_type: "",
    content_title: "",
    notes: "",
    units: 1
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("bonus-items", form);
      await api.recalcBonus();
      setForm({
        user_id: "",
        month_label: "",
        work_date: "",
        branch_id: "",
        content_type: "",
        content_title: "",
        notes: "",
        units: 1
      });
      onSaved("Saqlandi ✅");
      await reload();
    } catch (e2) {
      onSaved(e2.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  const totalBonus = bonuses.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  return (
    <div className="page-grid">
      <div className="panel-card">
        <div className="section-title">Oylik bonus hisobotini kiritish</div>
        <div className="bonus-total-box">
          Umumiy bonus summasi: <strong>{totalBonus.toLocaleString()} so‘m</strong>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Hodim</span>
            <select
              value={form.user_id}
              onChange={(e) => setField("user_id", e.target.value)}
              required
            >
              <option value="">Tanlang</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Oy</span>
            <input
              value={form.month_label}
              onChange={(e) => setField("month_label", e.target.value)}
              placeholder="2026-04"
              required
            />
          </label>

          <label>
            <span>Sana</span>
            <input
              type="date"
              value={form.work_date}
              onChange={(e) => setField("work_date", e.target.value)}
              required
            />
          </label>

          <label>
            <span>Filial</span>
            <select
              value={form.branch_id}
              onChange={(e) => setField("branch_id", e.target.value)}
            >
              <option value="">Tanlang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Kontent turi</span>
            <input
              value={form.content_type}
              onChange={(e) => setField("content_type", e.target.value)}
              placeholder="Story / Post / Reels"
              required
            />
          </label>

          <label>
            <span>Kontent nomi</span>
            <input
              value={form.content_title}
              onChange={(e) => setField("content_title", e.target.value)}
              placeholder="Kontent nomi"
            />
          </label>

          <label>
            <span>Soni</span>
            <input
              type="number"
              min="1"
              value={form.units}
              onChange={(e) => setField("units", Number(e.target.value))}
              required
            />
          </label>

          <label>
            <span>Birlik narx</span>
            <input value="25,000 so‘m" disabled />
          </label>

          <label>
            <span>Jami</span>
            <input
              value={`${(Number(form.units || 0) * 25000).toLocaleString()} so‘m`}
              disabled
            />
          </label>

          <label className="full-col">
            <span>Izoh</span>
            <input
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Izoh"
            />
          </label>

          <button className="primary-btn" disabled={saving} type="submit">
            {saving ? "Saqlanmoqda..." : "Bonus qatorini saqlash"}
          </button>
        </form>
      </div>

      <SimpleTablePage
        title="Bonuslar ro‘yxati"
        rows={bonuses}
        columns={[
          { key: "full_name", label: "Hodim" },
          { key: "month_label", label: "Oy" },
          { key: "total_units", label: "Soni" },
          { key: "unit_price", label: "Birlik narx" },
          { key: "total_amount", label: "Jami summa" }
        ]}
      />
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
        dailyReportsRes
      ] = await Promise.all([
        api.dashboard(),
        api.settings.get(),
        api.list("notifications").catch(() => []),
        api.list("users").catch(() => []),
        api.list("branches").catch(() => []),
        api.list("bonuses").catch(() => []),
        api.list("uploads").catch(() => []),
        api.list("content").catch(() => []),
        api.list("daily-reports").catch(() => [])
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
    return MENU.filter((m) =>
      m.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  function showSaved(msg = "Saqlandi ✅", type = "success") {
    setToast({ type, message: msg });
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
    setActive("dashboard");
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
  } else if (active === "bonus") {
    page = (
      <BonusPage
        bonuses={bonuses}
        users={users}
        branches={branches}
        onSaved={showSaved}
        reload={reloadData}
      />
    );
  } else if (active === "dailyReports") {
    page = (
      <DailyReportsPage
        rows={dailyReports}
        branches={branches}
        users={users}
        onSaved={showSaved}
        reload={reloadData}
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
  }

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-logo">a</div>
            <div>
              <div className="brand-title">aloo</div>
              <div className="brand-sub">SMM platforma</div>
            </div>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Qidiruv..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="menu">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`menu-btn ${active === item.id ? "active" : ""}`}
                  onClick={() => setActive(item.id)}
                  type="button"
                >
                  <span>
                    <Icon size={16} />
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>

          <button className="logout-btn" onClick={logout} type="button">
            <LogOut size={16} />
            Chiqish
          </button>
        </aside>

        <main className="main">
          <div className="topbar">
            <div>
              <h1>{MENU.find((m) => m.id === active)?.title || "Bosh sahifa"}</h1>
              <p>Asalomu alaykum, {user.full_name}</p>
            </div>

            <div className="topbar-right">
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <div className="notif-pill">
                <Bell size={16} />
                {notifications.length}
              </div>
              <div className="user-pill">
                <User size={16} />
                {user.role}
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

const styles = `
:root{
  --bg:#0b1220;
  --panel:#121c2d;
  --panel2:#182335;
  --line:rgba(255,255,255,.08);
  --text:#eef4ff;
  --muted:#9cb0cb;
  --blue:#2497ff;
  --blue2:#6bddff;
  --green:#1fbe73;
  --red:#ef5a5a;
}
:root[data-theme='light']{
  --bg:#eef5fb;
  --panel:#ffffff;
  --panel2:#f7fbff;
  --line:#dfeaf4;
  --text:#10243a;
  --muted:#6f8499;
  --blue:#2497ff;
  --blue2:#6bddff;
  --green:#1fbe73;
  --red:#ef5a5a;
}
*{box-sizing:border-box}
html,body,#root{margin:0;min-height:100%;font-family:Inter,Arial,sans-serif;background:var(--bg);color:var(--text)}
button,input,select{font:inherit}
input,select{outline:none}
.loading-screen{min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text)}

.login-page{
  min-height:100vh;
  display:grid;
  grid-template-columns:1.1fr .9fr;
  gap:32px;
  padding:40px;
  background:linear-gradient(180deg,var(--bg),#111b2b);
}
.login-left{display:flex;flex-direction:column;justify-content:center}
.login-left h1{margin:0;font-size:54px}
.login-left h2{margin:12px 0 0;font-size:28px;line-height:1.2;max-width:760px}
.login-left p{margin:18px 0 0;color:var(--muted);font-size:18px}
.mini-badge{
  display:inline-flex;
  width:max-content;
  padding:10px 14px;
  border-radius:999px;
  background:rgba(36,151,255,.14);
  border:1px solid rgba(36,151,255,.25);
  color:#bfe5ff;
  margin-bottom:18px;
}
.login-card{
  align-self:center;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:28px;
  padding:28px;
  display:grid;
  gap:16px;
  box-shadow:0 20px 50px rgba(0,0,0,.2);
}
.login-title{font-size:30px;font-weight:800}
.login-card label{display:grid;gap:8px}
.login-card label span{color:var(--muted);font-size:13px}
.login-card input{
  background:var(--panel2);
  border:1px solid var(--line);
  color:var(--text);
  border-radius:16px;
  padding:14px 16px;
}
.primary-btn{
  border:0;
  border-radius:16px;
  padding:14px 18px;
  cursor:pointer;
  font-weight:800;
  color:#fff;
  background:linear-gradient(135deg,var(--blue),var(--blue2));
}
.error-box{
  background:rgba(239,90,90,.14);
  color:#ffb3b3;
  border:1px solid rgba(239,90,90,.2);
  padding:12px 14px;
  border-radius:14px;
}

.app-shell{
  min-height:100vh;
  display:grid;
  grid-template-columns:280px 1fr;
  background:var(--bg);
}
.sidebar{
  padding:18px;
  border-right:1px solid var(--line);
  background:var(--panel);
  display:flex;
  flex-direction:column;
  gap:16px;
}
.brand{display:flex;gap:12px;align-items:center}
.brand-logo{
  width:48px;height:48px;border-radius:16px;
  display:grid;place-items:center;
  background:linear-gradient(135deg,var(--blue),var(--blue2));
  color:#fff;font-weight:900;font-size:24px;
}
.brand-title{font-size:22px;font-weight:800}
.brand-sub{font-size:12px;color:var(--muted)}
.search-box{
  display:flex;align-items:center;gap:10px;
  background:var(--panel2);
  border:1px solid var(--line);
  border-radius:16px;padding:12px 14px;
}
.search-box input{
  width:100%;
  border:0;background:transparent;color:var(--text);
}
.menu{display:grid;gap:10px}
.menu-btn{
  border:1px solid transparent;
  background:rgba(255,255,255,.04);
  color:var(--text);
  border-radius:16px;
  padding:14px 16px;
  cursor:pointer;
  text-align:left;
  font-weight:700;
}
.menu-btn span{display:flex;gap:10px;align-items:center}
.menu-btn.active{
  background:linear-gradient(135deg,rgba(36,151,255,.2),rgba(109,221,255,.12));
  border-color:rgba(36,151,255,.2);
}
.logout-btn{
  margin-top:auto;
  border:0;
  border-radius:16px;
  padding:14px 16px;
  background:linear-gradient(135deg,var(--red),#ff8e8e);
  color:#fff;
  cursor:pointer;
  font-weight:700;
  display:flex;gap:10px;align-items:center;justify-content:center;
}
.main{padding:24px}
.topbar{
  display:flex;justify-content:space-between;gap:18px;align-items:center;flex-wrap:wrap;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:20px 22px;
}
.topbar h1{margin:0;font-size:34px}
.topbar p{margin:6px 0 0;color:var(--muted)}
.topbar-right{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.theme-toggle,.notif-pill,.user-pill{
  border:1px solid var(--line);
  background:var(--panel2);
  color:var(--text);
  border-radius:14px;
  padding:12px 14px;
  display:flex;gap:8px;align-items:center;
}
.page-grid{display:grid;gap:18px;margin-top:18px}
.hero-card,.panel-card,.stat-card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:20px;
}
.hero-card h3{margin:12px 0 8px;font-size:34px}
.hero-card p{margin:0;color:var(--muted)}
.stats-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:18px;
}
.stat-title{color:var(--muted);font-size:14px}
.stat-value{font-size:40px;font-weight:900;margin-top:10px}
.section-title{font-size:24px;font-weight:800;margin-bottom:16px}
.form-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:14px;
}
.form-grid label{display:grid;gap:8px}
.form-grid label span{color:var(--muted);font-size:13px}
.form-grid input,
.form-grid select{
  background:var(--panel2);
  border:1px solid var(--line);
  color:var(--text);
  border-radius:14px;
  padding:13px 14px;
}
.row.between{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}
.muted{color:var(--muted)}
.mt16{margin-top:16px}
.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:18px}
table{width:100%;border-collapse:collapse}
th,td{padding:12px;border-bottom:1px solid var(--line);text-align:left}
th{color:var(--muted);background:rgba(255,255,255,.03)}
.empty-cell{text-align:center;color:var(--muted);padding:20px}
.toast{
  position:fixed;
  right:20px;bottom:20px;
  min-width:240px;
  display:flex;justify-content:space-between;gap:12px;align-items:center;
  padding:14px 16px;
  border-radius:16px;
  color:#fff;
  box-shadow:0 18px 40px rgba(0,0,0,.25);
  z-index:9999;
}
.toast-success{background:linear-gradient(135deg,var(--green),#56e3a2)}
.toast-error{background:linear-gradient(135deg,var(--red),#ff8e8e)}
.toast button{background:transparent;border:0;color:#fff;cursor:pointer}
.full-col{grid-column:1 / -1}
.bonus-total-box{
  margin-bottom:16px;
  padding:14px 16px;
  border-radius:16px;
  background:rgba(36,151,255,.12);
  border:1px solid rgba(36,151,255,.18);
  font-size:16px;
}

@media (max-width: 1100px){
  .login-page,.app-shell,.form-grid,.stats-grid{grid-template-columns:1fr}
  .main{padding:14px}
  .topbar h1{font-size:28px}
}
`;
