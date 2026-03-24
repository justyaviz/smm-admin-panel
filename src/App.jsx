import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Gift,
  LayoutDashboard,
  Lock,
  LogOut,
  Megaphone,
  MoonStar,
  PlayCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  WalletCards,
  BadgePercent
} from "lucide-react";

const menu = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  { id: "reports", title: "Hisobotlar", icon: BarChart3 },
  { id: "plan", title: "Oylik reja", icon: CalendarDays },
  { id: "actions", title: "Harakatlar", icon: PlayCircle },
  { id: "bonus", title: "Bonus tizimi", icon: Gift },
  { id: "content", title: "Kontent reja", icon: ClipboardList },
  { id: "shooting", title: "Syomka", icon: Camera },
  { id: "social", title: "Ijtimoiy tarmoqlar", icon: Megaphone }
];

const kpis = [
  { label: "Oylik qamrov", value: "12.4M", delta: "+18%", icon: TrendingUp },
  { label: "Leadlar", value: "4,286", delta: "+9%", icon: Target },
  { label: "Aktiv kampaniya", value: "18", delta: "+4", icon: Sparkles },
  { label: "Bonus fondi", value: "24.8M", delta: "+12%", icon: WalletCards }
];

const tasks = [
  { name: "Navro‘z kampaniyasi cover", owner: "Madina", status: "Tayyor", due: "Bugun" },
  { name: "Stories syomka — Parkent filial", owner: "Aziz", status: "Jarayonda", due: "18:30" },
  { name: "Reels copy review", owner: "Yaviz", status: "Ko‘rilmoqda", due: "Ertaga" },
  { name: "Mart hisobot PDF", owner: "Dilshod", status: "Tasdiq kutmoqda", due: "29-mart" }
];

const channels = [
  { name: "Instagram", value: "68%", sub: "Eng kuchli kanal", cls: "glow-pink" },
  { name: "Telegram", value: "21%", sub: "Konversiya yaxshi", cls: "glow-blue" },
  { name: "YouTube", value: "11%", sub: "Watch time o‘smoqda", cls: "glow-red" }
];

function GlassCard({ children, className = "" }) {
  return <div className={`glass-card ${className}`}>{children}</div>;
}

function SoftButton({ children, active = false, onClick, className = "", type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`soft-btn ${active ? "soft-btn-active" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

function LoginScreen({ onEnter }) {
  const [login, setLogin] = useState("smm.admin");
  const [password, setPassword] = useState("aloo2026");

  const submit = (e) => {
    e.preventDefault();
    if (!login.trim() || !password.trim()) return;
    onEnter();
  };

  return (
    <div className="login-page">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      <div className="login-layout">
        <div className="login-left">
          <div className="pill">
            <Sparkles size={16} />
            <span>aloo • SMM boshqaruv markazi</span>
          </div>

          <h1 className="login-title">
            Zamonaviy,
            <span> premium admin panel</span>
          </h1>

          <p className="login-text">
            Oylik reja, hisobot, bonus, syomka, kontent va ijtimoiy tarmoqlar
            boshqaruvini bitta kuchli va chiroyli panelga yig‘amiz.
          </p>

          <div className="feature-grid">
            {["3D tugmalar", "Glass premium UI", "Role-based login", "Hisobotlar markazi"].map(
              (item) => (
                <GlassCard key={item} className="feature-card">
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </GlassCard>
              )
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          className="login-right"
        >
          <GlassCard className="login-card">
            <div className="login-card-orb login-card-orb-1" />
            <div className="login-card-orb login-card-orb-2" />

            <div className="login-head">
              <div className="login-icon">
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="login-head-title">Kirish</div>
                <div className="login-head-sub">Faqat aloo SMM jamoasi uchun</div>
              </div>
            </div>

            <form className="login-form" onSubmit={submit}>
              <div className="field">
                <label>Login</label>
                <div className="field-box">
                  <User size={16} />
                  <input
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="Login"
                  />
                </div>
              </div>

              <div className="field">
                <label>Parol</label>
                <div className="field-box">
                  <Lock size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parol"
                  />
                </div>
              </div>

              <button type="submit" className="primary-btn">
                Panelga kirish
              </button>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ item }) {
  const Icon = item.icon;
  return (
    <GlassCard className="stat-card">
      <div className="stat-top">
        <div>
          <div className="stat-label">{item.label}</div>
          <div className="stat-value">{item.value}</div>
          <div className="stat-delta">{item.delta}</div>
        </div>
        <div className="stat-icon">
          <Icon size={20} />
        </div>
      </div>
    </GlassCard>
  );
}

function Sidebar({ active, setActive }) {
  return (
    <GlassCard className="sidebar">
      <div className="brand-box">
        <div className="brand-logo">a</div>
        <div>
          <div className="brand-name">aloo</div>
          <div className="brand-sub">SMM department</div>
        </div>
      </div>

      <div className="menu-list">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <SoftButton
              key={item.id}
              active={active === item.id}
              onClick={() => setActive(item.id)}
              className="menu-btn"
            >
              <span className="menu-left">
                <Icon size={16} />
                {item.title}
              </span>
              <ChevronRight size={16} />
            </SoftButton>
          );
        })}
      </div>

      <GlassCard className="quick-box">
        <div className="quick-title">Tez menyu</div>
        <div className="quick-grid">
          <SoftButton className="center-btn">
            <BadgePercent size={16} />
            Bonus
          </SoftButton>
          <SoftButton className="center-btn">
            <BarChart3 size={16} />
            KPI
          </SoftButton>
        </div>
      </GlassCard>
    </GlassCard>
  );
}

function DashboardView() {
  return (
    <div className="page-stack">
      <div className="kpi-grid">
        {kpis.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </div>

      <div className="main-grid">
        <GlassCard className="wide-card">
          <div className="card-head">
            <div>
              <div className="card-title">Oylik harakatlar</div>
              <div className="card-sub">Mart oyidagi asosiy progress</div>
            </div>
            <SoftButton>
              <CalendarDays size={16} />
              2026 mart
            </SoftButton>
          </div>

          <div className="progress-grid">
            {[
              ["Kontent", 82],
              ["Syomka", 67],
              ["Hisobot", 91]
            ].map(([label, value]) => (
              <div key={label} className="progress-box">
                <div className="progress-label">{label}</div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${value}%` }} />
                </div>
                <div className="progress-value">{value}%</div>
              </div>
            ))}
          </div>

          <div className="chart-box">
            {[46, 70, 58, 88, 74, 92, 84, 98].map((h, i) => (
              <div key={i} className="bar-wrap">
                <div className="bar" style={{ height: `${h * 1.6}px` }} />
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="side-card">
          <div className="card-title">Kanal ulushi</div>
          <div className="channel-list">
            {channels.map((item) => (
              <div key={item.name} className={`channel-box ${item.cls}`}>
                <div>
                  <div className="channel-name">{item.name}</div>
                  <div className="channel-sub">{item.sub}</div>
                </div>
                <div className="channel-value">{item.value}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="main-grid">
        <GlassCard className="wide-card">
          <div className="card-head">
            <div>
              <div className="card-title">Vazifalar</div>
              <div className="card-sub">Jamoa bo‘yicha ishlar holati</div>
            </div>
            <SoftButton>
              <Users size={16} />
              Team board
            </SoftButton>
          </div>

          <div className="task-list">
            {tasks.map((task) => (
              <div key={task.name} className="task-row">
                <div>
                  <div className="task-name">{task.name}</div>
                  <div className="task-sub">Mas’ul: {task.owner}</div>
                </div>
                <div className="task-tags">
                  <span className="tag">{task.status}</span>
                  <span className="tag tag-blue">{task.due}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="side-card">
          <div className="card-title">Bonus snapshot</div>
          <div className="bonus-box">
            <div className="bonus-sub">Bu oy tarqatiladigan bonus</div>
            <div className="bonus-value">12.6M</div>
            <div className="bonus-green">+2.1M o‘tgan oyga nisbatan</div>
          </div>

          <div className="bonus-list">
            {["KPI asosida", "Kontent topshirish", "Vaqtida hisobot", "Extra campaign"].map(
              (item) => (
                <div key={item} className="bonus-row">
                  <span>{item}</span>
                  <CheckCircle2 size={16} />
                </div>
              )
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function PlaceholderView({ title, desc }) {
  return (
    <div className="main-grid">
      <GlassCard className="wide-card">
        <div className="page-title">{title}</div>
        <p className="page-desc">{desc}</p>

        <div className="placeholder-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="placeholder-box">
              <div className="progress-label">Blok {n}</div>
              <div className="placeholder-number">0{n}</div>
              <div className="channel-sub">
                Bu bo‘lim keyingi iteratsiyada real ma’lumot bilan to‘ldiriladi.
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="side-card">
        <div className="card-title">Tez amallar</div>
        <div className="action-list">
          <SoftButton className="menu-btn">
            <span className="menu-left">Yangi yozuv</span>
            <ChevronRight size={16} />
          </SoftButton>
          <SoftButton className="menu-btn">
            <span className="menu-left">Filterlash</span>
            <ChevronRight size={16} />
          </SoftButton>
          <SoftButton className="menu-btn">
            <span className="menu-left">Export</span>
            <ChevronRight size={16} />
          </SoftButton>
        </div>
      </GlassCard>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [active, setActive] = useState("dashboard");

  const current = useMemo(() => {
    switch (active) {
      case "dashboard":
        return <DashboardView />;
      case "reports":
        return (
          <PlaceholderView
            title="Hisobotlar markazi"
            desc="Kunlik, haftalik va oylik ko‘rsatkichlarni eksport, solishtirish va vizual tahlil qilish uchun professional bo‘lim."
          />
        );
      case "plan":
        return (
          <PlaceholderView
            title="Oylik reja"
            desc="Kontent kalendar, deadline, mas’ullar va kampaniya maqsadlarini tartibli boshqarish oynasi."
          />
        );
      case "actions":
        return (
          <PlaceholderView
            title="Harakatlar"
            desc="SMM jamoasining barcha operativ ishlari, task holati va ichki harakatlar logi shu yerda jamlanadi."
          />
        );
      case "bonus":
        return (
          <PlaceholderView
            title="Bonus tizimi"
            desc="Xodimlar KPI, bonus formulasi, tasdiqlash va tarixni ko‘rsatadigan boshqaruv markazi."
          />
        );
      case "content":
        return (
          <PlaceholderView
            title="Kontent reja"
            desc="Post, reels, stories va promo kampaniyalar uchun to‘liq kontent boshqaruv bo‘limi."
          />
        );
      case "shooting":
        return (
          <PlaceholderView
            title="Syomka"
            desc="Syomka jadvali, lokatsiya, texnika, referens va montaj holati uchun qulay panel."
          />
        );
      case "social":
        return (
          <PlaceholderView
            title="Ijtimoiy tarmoqlar"
            desc="Instagram, Telegram, YouTube va boshqa kanallar bo‘yicha monitoring va growth panel."
          />
        );
      default:
        return <DashboardView />;
    }
  }, [active]);

  if (!authenticated) {
    return <LoginScreen onEnter={() => setAuthenticated(true)} />;
  }

  return (
    <div className="app-shell">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      <div className="dashboard-layout">
        <Sidebar active={active} setActive={setActive} />

        <div className="content-side">
          <GlassCard className="topbar">
            <div className="topbar-row">
              <div>
                <div className="card-sub">Xush kelibsiz</div>
                <div className="topbar-title">aloo SMM Admin Panel</div>
              </div>

              <div className="topbar-actions">
                <div className="search-box">
                  <Search size={16} />
                  <span>Izlash...</span>
                </div>

                <SoftButton>
                  <Bell size={16} />
                  Bildirishnoma
                </SoftButton>
                <SoftButton>
                  <MoonStar size={16} />
                  Dark UI
                </SoftButton>
                <SoftButton>
                  <Settings size={16} />
                  Sozlamalar
                </SoftButton>
                <button className="logout-btn" onClick={() => setAuthenticated(false)}>
                  <LogOut size={16} />
                  Chiqish
                </button>
              </div>
            </div>
          </GlassCard>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              {current}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
