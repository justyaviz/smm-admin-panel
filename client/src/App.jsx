import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  FileBarChart2,
  FolderKanban,
  Gift,
  Home,
  Image,
  LayoutGrid,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";
import { api, clearAuth, getCurrentUser } from "./api";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Toast from "./components/ui/Toast";
import Dashboard from "./pages/Dashboard";
import Bonus from "./pages/Bonus";
import BonusPage from "./pages/Bonus";
import DailyReportsPage from "./pages/DailyReports";
import MediaLibraryPage from "./pages/MediaLibrary";
import UsersPage from "./pages/Users";
import CampaignsPage from "./pages/Campaigns";
import DailyReports from "./pages/DailyReports";
import Campaigns from "./pages/Campaigns";
import MediaLibrary from "./pages/MediaLibrary";
import UsersPage from "./pages/Users";
import SettingsPage from "./pages/Settings";
import ContentPlan from "./pages/ContentPlan";
import TasksPage from "./pages/Tasks";
import BranchesPage from "./pages/Branches";

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
          <button className="theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀" : "☾"}</button>
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
      const [dashboardRes, settingsRes, notificationsRes, usersRes, branchesRes, bonusRes, uploadsRes, contentRes, dailyReportsRes, campaignsRes, tasksRes] = await Promise.all([
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
    } catch {
      // intentionally silent for starter package
    }
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
      </>
    );
  }

  let page = null;
  } else if (active === "bonus") {
  page = (
    <BonusPage
      bonuses={bonuses}
      users={users}
      branches={branches}
      onToast={showToast}
      reload={reloadData}
    />
  );
} else if (active === "dailyReports") {
  page = (
    <DailyReportsPage
      reports={dailyReports}
      branches={branches}
      users={users}
      onToast={showToast}
      reload={reloadData}
    />
  );
} else if (active === "uploads") {
  page = (
    <MediaLibraryPage
      uploads={uploads}
      onToast={showToast}
      reload={reloadData}
    />
  );
} else if (active === "users") {
  page = (
    <UsersPage
      users={users}
      onToast={showToast}
      reload={reloadData}
    />
  );
} else if (active === "campaigns") {
  page = (
    <CampaignsPage
      campaigns={campaigns}
      onToast={showToast}
      reload={reloadData}
    />
  );

  return (
    <>
      <div className="app-shell">
        <Sidebar menu={filteredMenu} active={active} setActive={setActive} search={search} setSearch={setSearch} onLogout={logout} />
        <main className="main-area">
          <Topbar title={MENU.find((m) => m.id === active)?.title || "Bosh sahifa"} user={user} notificationsCount={notifications.length} theme={theme} setTheme={setTheme} />
          {page}
        </main>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
