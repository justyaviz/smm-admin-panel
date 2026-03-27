import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Eye,
  FileBarChart2,
  FolderKanban,
  Gift,
  Home,
  Image,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Megaphone,
  Moon,
  Pencil,
  Search,
  Send,
  Settings,
  SunMedium,
  Trash2,
  Upload,
  User,
  Users as UsersIcon,
  ShieldCheck,
  X
} from "lucide-react";
import { api, clearAuth, getCurrentUser } from "./api";

const MENU = [
  { id: "dashboard", title: "Bosh sahifa", icon: Home },
  { id: "content", title: "Kontent reja", icon: LayoutGrid },
  { id: "bonus", title: "Bonus tizimi", icon: Gift },
  { id: "dailyReports", title: "Kunlik filial hisobotlari", icon: FileBarChart2 },
  { id: "campaigns", title: "Reklama kampaniyalari", icon: Megaphone },
  { id: "uploads", title: "Media kutubxona", icon: Image },
  { id: "users", title: "Hodimlar", icon: UsersIcon },
  { id: "tasks", title: "Vazifalar", icon: FolderKanban },
  { id: "chat", title: "Chat", icon: MessageCircle },
  { id: "audit", title: "Audit log", icon: ShieldCheck },
  { id: "profile", title: "Profil", icon: User },
  { id: "settings", title: "Sozlamalar", icon: Settings }
];

const PERMISSION_OPTIONS = [
  { id: "dashboard", label: "Bosh sahifa" },
  { id: "content", label: "Kontent reja" },
  { id: "content_create", label: "Kontent qo'shish" },
  { id: "content_edit", label: "Kontent tahrirlash" },
  { id: "content_delete", label: "Kontent o'chirish" },
  { id: "bonus", label: "Bonus tizimi" },
  { id: "bonus_create", label: "Bonus qo'shish" },
  { id: "bonus_edit", label: "Bonus tahrirlash" },
  { id: "bonus_delete", label: "Bonus o'chirish" },
  { id: "dailyReports", label: "Kunlik filial hisobotlari" },
  { id: "dailyReports_create", label: "Hisobot qo'shish" },
  { id: "dailyReports_edit", label: "Hisobot tahrirlash" },
  { id: "dailyReports_delete", label: "Hisobot o'chirish" },
  { id: "campaigns", label: "Reklama kampaniyalari" },
  { id: "campaigns_create", label: "Kampaniya qo'shish" },
  { id: "campaigns_edit", label: "Kampaniya tahrirlash" },
  { id: "campaigns_delete", label: "Kampaniya o'chirish" },
  { id: "uploads", label: "Media kutubxona" },
  { id: "uploads_create", label: "Fayl yuklash" },
  { id: "uploads_delete", label: "Fayl o'chirish" },
  { id: "users", label: "Hodimlar" },
  { id: "users_create", label: "Hodim qo'shish" },
  { id: "users_edit", label: "Hodim tahrirlash" },
  { id: "users_delete", label: "Hodim o'chirish" },
  { id: "tasks", label: "Vazifalar" },
  { id: "tasks_create", label: "Vazifa qo'shish" },
  { id: "tasks_edit", label: "Vazifa tahrirlash" },
  { id: "tasks_delete", label: "Vazifa o'chirish" },
  { id: "chat", label: "Chat" },
  { id: "chat_send", label: "Xabar yuborish" },
  { id: "audit", label: "Audit log" },
  { id: "profile", label: "Profil" },
  { id: "settings", label: "Sozlamalar" }
];

function getMonthLabel(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getMonthTitle(monthLabel) {
  const [year, month] = String(monthLabel || getMonthLabel()).split("-");
  const names = {
    "01": "Yanvar",
    "02": "Fevral",
    "03": "Mart",
    "04": "Aprel",
    "05": "May",
    "06": "Iyun",
    "07": "Iyul",
    "08": "Avgust",
    "09": "Sentabr",
    "10": "Oktabr",
    "11": "Noyabr",
    "12": "Dekabr"
  };
  return `${names[month] || month} ${year || ""}`.trim();
}

function shiftMonth(monthLabel, step) {
  const [y, m] = String(monthLabel || getMonthLabel()).split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + step, 1);
  return getMonthLabel(d);
}

function safePermissions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatDate(value) {
  if (!value) return "-";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (value.includes("T")) return value.slice(0, 10);
    return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString()} so‘m`;
}

function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;

  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`modal-card ${wide ? "wide" : ""}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function IconActions({ onView, onEdit, onDelete }) {
  return (
    <div className="icon-actions">
      {onView ? (
        <button type="button" className="icon-btn" onClick={onView} title="Ko‘rish">
          <Eye size={16} />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" className="icon-btn" onClick={onEdit} title="Tahrirlash">
          <Pencil size={16} />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className="icon-btn danger" onClick={onDelete} title="O‘chirish">
          <Trash2 size={16} />
        </button>
      ) : null}
    </div>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 2800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type || "success"}`}>
      <div className="toast-glow" />
      <div className="toast-copy">
        <strong>{toast.type === "error" ? "Xatolik" : "Bajarildi"}</strong>
        <span>{toast.message}</span>
      </div>
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

function NotificationsDrawer({ open, onClose, notifications = [], onRead, onReadAll }) {
  return (
    <div className={`drawer ${open ? "open" : ""}`}>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel">
        <div className="drawer-head">
          <div>
            <div className="small-label">Bildirishnomalar</div>
            <h3>So‘nggi yangiliklar</h3>
          </div>
          <button type="button" className="btn secondary" onClick={onReadAll}>
            Hammasini o‘qildi
          </button>
        </div>

        <div className="drawer-list">
          {notifications.length ? (
            notifications.map((item) => (
              <div key={item.id} className={`notif-card ${item.is_read ? "read" : ""}`}>
                <div className="notif-title">{item.title}</div>
                <div className="notif-body">{item.body}</div>
                <div className="notif-footer">
                  <span>{item.type}</span>
                  {!item.is_read ? (
                    <button type="button" className="link-btn" onClick={() => onRead(item.id)}>
                      O‘qildi
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-block">Hozircha bildirishnoma yo‘q</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, desc, right }) {
  return (
    <div className="section-title-row">
      <div>
        <h2>{title}</h2>
        {desc ? <p>{desc}</p> : null}
      </div>
      {right}
    </div>
  );
}

function StatCard({ title, value, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-card-title">{title}</div>
      <div className="stat-card-value">{value}</div>
      {hint ? <div className="stat-card-hint">{hint}</div> : null}
    </div>
  );
}

function taskStatusClass(status) {
  if (status === "done") return "status-badge done";
  if (status === "doing") return "status-badge doing";
  if (status === "cancelled") return "status-badge cancelled";
  return "status-badge todo";
}

function priorityClass(priority) {
  if (priority === "high") return "priority-badge high";
  if (priority === "low") return "priority-badge low";
  return "priority-badge medium";
}

function taskStatusLabel(status) {
  const labels = {
    todo: "Rejada",
    doing: "Bajarilmoqda",
    done: "Bajarilgan",
    cancelled: "Bekor qilingan"
  };
  return labels[status] || status;
}

function getAvatarFallback(name = "") {
  return String(name || "?").trim().slice(0, 1).toUpperCase() || "?";
}

function hasPermission(user, permission) {
  if (user?.role === "admin") return true;
  return safePermissions(user?.permissions_json).includes(permission);
}

function canManagePage(user, pageKey, action) {
  if (user?.role === "admin") return true;
  return hasPermission(user, pageKey) || hasPermission(user, `${pageKey}_${action}`);
}

const LOGIN_LOGO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1d4ed8"/>
          <stop offset="55%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#6ee7b7"/>
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="140" height="140" rx="42" fill="url(#g)"/>
      <circle cx="58" cy="56" r="16" fill="rgba(255,255,255,0.32)"/>
      <path d="M79 43c18 0 33 15 33 33S97 109 79 109 46 94 46 76s15-33 33-33Z" fill="rgba(255,255,255,0.16)"/>
      <path d="M84.8 110H68.7l4.9-14.5H60.7L83.5 50h16.4l-5.2 15.6h13.4z" fill="white"/>
    </svg>
  `);

function LoginPage({ onLoggedIn, settings }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const logoSrc = settings?.logo_url || LOGIN_LOGO;

  async function submit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await api.login({ phone, password });
      const me = await api.me();
      onLoggedIn(me.user);
    } catch (err) {
      setError(err.message || "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-particles">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="login-particle"
            style={{
              left: `${6 + index * 5.1}%`,
              animationDelay: `${index * 0.6}s`,
              animationDuration: `${12 + (index % 5) * 2.3}s`
            }}
          />
        ))}
      </div>
      <div className="login-orb orb-one" />
      <div className="login-orb orb-two" />
      <div className="login-grid-line" />

      <div className="login-copy">
        <div className="brand-kicker">aloo • yagona platforma</div>
        <div className="login-logo-lockup">
          <img src={logoSrc} alt="aloo logo" className="login-logo-image" />
          <div className="login-logo-copy">
            <strong>{settings?.company_name || "aloo SMM"}</strong>
            <span>{settings?.platform_name || "Yagona boshqaruv platformasi"}</span>
          </div>
        </div>
        <h1>Assalomu alaykum</h1>
        <h2>aloo do‘konlar tarmog‘i SMM jamoasi yagona ma’lumotlar platformasiga xush kelibsiz</h2>
        <p>Kirish uchun login va parolingizni kiriting.</p>
        <div className="login-feature-row">
          <div className="login-feature-card">
            <strong>Kontent</strong>
            <span>Reja, bonus va ijro jarayonlari bir joyda.</span>
          </div>
          <div className="login-feature-card">
            <strong>Jamoa</strong>
            <span>Chat, vazifa va hisobotlar bir panelda boshqariladi.</span>
          </div>
        </div>
      </div>

      <form className="login-card" onSubmit={submit}>
        <div className="login-card-shine" />
        {loading ? (
          <div className="login-loading">
            <div className="login-loader-ring" />
            <span>Kirish tekshirilmoqda...</span>
          </div>
        ) : null}
        <div className="small-label">Kirish</div>
        <div className="login-title">Xush kelibsiz</div>

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

        {error ? <div className="error-box">{error}</div> : null}

        <button type="submit" className="btn primary large" disabled={loading}>
          {loading ? "Kirilmoqda..." : "Kirish"}
        </button>
      </form>
    </div>
  );
}

function DashboardPage({ summary = {}, dailyReports = [], bonusItems = [], contentRows = [] }) {
  const currentMonth = getMonthLabel();

  const thisMonthContent = (contentRows || []).filter((row) => {
    if (!row.publish_date) return false;
    return formatDate(row.publish_date).slice(0, 7) === currentMonth;
  });

  const totalPlan = thisMonthContent.length;
  const postedCount = thisMonthContent.filter((row) => row.status === "joylangan").length;
  const progress = totalPlan ? Math.round((postedCount / totalPlan) * 100) : 0;

  const thisMonthBonus = (bonusItems || [])
    .filter((row) => (row.month_label || formatDate(row.work_date).slice(0, 7)) === currentMonth)
    .reduce((sum, row) => sum + Number(row.total_amount || row.amount || 0), 0);

  return (
    <div className="page-grid">
      <div className="hero-banner">
        <div>
          <div className="small-label">Boshqaruv markazi</div>
          <h1>aloo SMM jamoasi platformasi</h1>
          <p>Kontent reja, bonus, filial hisobotlari va media boshqaruvi bitta joyda.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Kontent reja bajarilishi"
          value={`${progress}%`}
          hint={`${postedCount} / ${totalPlan} joylangan`}
        />
        <StatCard
          title="Joriy oy bonus puli"
          value={formatMoney(thisMonthBonus)}
          hint={getMonthTitle(currentMonth)}
        />
        <StatCard
          title="Bugungi filial hisobotlari"
          value={summary?.today_report_count || 0}
          hint="bugungi ma’lumot"
        />
        <StatCard
          title="Faol vazifalar"
          value={summary?.task_count || 0}
          hint="umumiy vazifalar"
        />
      </div>

      <div className="two-grid">
        <div className="card">
          <SectionTitle title="So‘nggi filial hisobotlari" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Filial</th>
                  <th>Stories</th>
                  <th>Post</th>
                  <th>Reels</th>
                </tr>
              </thead>
              <tbody>
                {(dailyReports || []).slice(0, 5).map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.report_date)}</td>
                    <td>{row.branch_name}</td>
                    <td>{row.stories_count}</td>
                    <td>{row.posts_count}</td>
                    <td>{row.reels_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <SectionTitle title="Kontent holati" />
          <div className="quick-list">
            <div className="quick-item">Reja: <strong>{thisMonthContent.filter((r) => r.status === "reja").length}</strong></div>
            <div className="quick-item">Tayyorlanmoqda: <strong>{thisMonthContent.filter((r) => r.status === "tayyorlanmoqda").length}</strong></div>
            <div className="quick-item">Tayyor: <strong>{thisMonthContent.filter((r) => r.status === "tayyor").length}</strong></div>
            <div className="quick-item">Joylangan: <strong>{thisMonthContent.filter((r) => r.status === "joylangan").length}</strong></div>
            <div className="quick-item">Bekor qilingan: <strong>{thisMonthContent.filter((r) => r.status === "bekor_qilingan").length}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentPage({ users = [], onToast, reload }) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthLabel());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bonusMode, setBonusMode] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const emptyForm = {
    title: "",
    publish_date: "",
    status: "reja",
    platform_primary: "Instagram",
    platform_secondary: "",
    content_type: "post",
    assigned_user_id: "",
    editor_user_id: "",
    face_voice_user_id: "",
    proposal_count: "",
    approved_count: ""
  };

  const [form, setForm] = useState(emptyForm);
  const isVideo = form.content_type === "video";

  async function loadMonth(monthValue = selectedMonth) {
    try {
      setLoading(true);
      const data = await api.list("content", { month: monthValue });
      const sorted = (data || []).sort((a, b) => {
        const aDate = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const bDate = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return bDate - aDate;
      });
      setRows(sorted);
    } catch (err) {
      onToast(err.message || "Kontent rejani olib bo‘lmadi", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonth(selectedMonth);
  }, [selectedMonth]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setBonusMode(false);
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    const platforms = String(row.platform || "").split(",").map((x) => x.trim()).filter(Boolean);

    setForm({
      title: row.title || "",
      publish_date: formatDate(row.publish_date) === "-" ? "" : formatDate(row.publish_date),
      status: row.status || "reja",
      platform_primary: platforms[0] || "Instagram",
      platform_secondary: platforms[1] || "",
      content_type: row.content_type || "post",
      assigned_user_id: row.assigned_user_id || "",
      editor_user_id: row.video_editor_user_id || "",
      face_voice_user_id: row.video_face_user_id || "",
      proposal_count: row.proposal_count ?? "",
      approved_count: row.approved_count ?? ""
    });

    setBonusMode(!!row.bonus_enabled);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (isVideo) {
      if (!form.editor_user_id || !form.face_voice_user_id) {
        onToast("Video uchun 2 ta hodim tanlanishi kerak", "error");
        return;
      }
    } else {
      if (!form.assigned_user_id) {
        onToast("Mas’ul shaxsni tanlang", "error");
        return;
      }
    }

    if (bonusMode && !form.proposal_count) {
      onToast("Taklif soni majburiy", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        publish_date: form.publish_date || null,
        status: form.status,
        platform: [form.platform_primary, form.platform_secondary].filter(Boolean).join(", "),
        content_type: form.content_type,
        assigned_user_id: isVideo ? null : form.assigned_user_id || null,
        video_editor_user_id: isVideo ? form.editor_user_id || null : null,
        video_face_user_id: isVideo ? form.face_voice_user_id || null : null,
        bonus_enabled: bonusMode,
        proposal_count: bonusMode ? Number(form.proposal_count || 0) : 0,
        approved_count: bonusMode ? Number(form.approved_count || 0) : 0,
        notes: ""
      };

      if (editRow?.id) {
        await api.update("content", editRow.id, payload);
        onToast("Kontent reja yangilandi ✅", "success");
      } else {
        await api.create("content", payload);
        onToast("Kontent reja saqlandi ✅", "success");
      }

      await loadMonth(selectedMonth);
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Saqlashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham o‘chirilsinmi?");
    if (!ok) return;

    try {
      await api.remove("content", id);
      await loadMonth(selectedMonth);
      await reload();
      onToast("Kontent o‘chirildi", "success");
    } catch (err) {
      onToast(err.message || "O‘chirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title={editRow ? "Kontent rejani tahrirlash" : "Kontent reja yaratish"}
          desc={`${getMonthTitle(selectedMonth)} uchun`}
          right={
            <div className="toolbar-actions">
              <button type="button" className="btn secondary" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
                ← Oldingi oy
              </button>
              <div className="summary-pill">
                <strong>{getMonthTitle(selectedMonth)}</strong>
              </div>
              <button type="button" className="btn secondary" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>
                Keyingi oy →
              </button>
              {editRow ? (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}
            </div>
          }
        />

        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Kontent nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label><span>Joylash sanasi</span><input type="date" value={form.publish_date} onChange={(e) => setField("publish_date", e.target.value)} required /></label>
          <label>
            <span>Holati</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="reja">Reja</option>
              <option value="tayyorlanmoqda">Tayyorlanmoqda</option>
              <option value="tayyor">Tayyor</option>
              <option value="joylangan">Joylangan</option>
              <option value="bekor_qilingan">Bekor qilingan</option>
            </select>
          </label>

          <label>
            <span>1-platforma</span>
            <select value={form.platform_primary} onChange={(e) => setField("platform_primary", e.target.value)}>
              <option value="Instagram">Instagram</option>
              <option value="Telegram">Telegram</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
              <option value="TikTok">TikTok</option>
            </select>
          </label>

          <label>
            <span>2-platforma</span>
            <select value={form.platform_secondary} onChange={(e) => setField("platform_secondary", e.target.value)}>
              <option value="">Tanlanmagan</option>
              <option value="Instagram">Instagram</option>
              <option value="Telegram">Telegram</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
              <option value="TikTok">TikTok</option>
            </select>
          </label>

          <label>
            <span>Kontent turi</span>
            <select value={form.content_type} onChange={(e) => setField("content_type", e.target.value)}>
              <option value="post">Post</option>
              <option value="story">Story</option>
              <option value="reels">Reels</option>
              <option value="video">Video</option>
              <option value="banner">Banner</option>
            </select>
          </label>

          {isVideo ? (
            <>
              <label>
                <span>Montaj kim qildi</span>
                <select value={form.editor_user_id} onChange={(e) => setField("editor_user_id", e.target.value)}>
                  <option value="">Tanlang</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>

              <label>
                <span>Face + ovoz kimniki</span>
                <select value={form.face_voice_user_id} onChange={(e) => setField("face_voice_user_id", e.target.value)}>
                  <option value="">Tanlang</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label>
              <span>Mas’ul shaxs</span>
              <select value={form.assigned_user_id} onChange={(e) => setField("assigned_user_id", e.target.value)}>
                <option value="">Tanlang</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </label>
          )}

          <label className="checkbox-row">
            <input type="checkbox" checked={bonusMode} onChange={(e) => setBonusMode(e.target.checked)} />
            <span>Bonusga o‘tkazish</span>
          </label>

          {bonusMode ? (
            <>
              <label><span>Taklif soni</span><input type="number" min="0" value={form.proposal_count} onChange={(e) => setField("proposal_count", e.target.value)} required /></label>
              <label><span>Tasdiq soni</span><input type="number" min="0" value={form.approved_count} onChange={(e) => setField("approved_count", e.target.value)} /></label>
            </>
          ) : null}

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle
          title={`${getMonthTitle(selectedMonth)} kontent rejasi`}
          right={
            <button
              type="button"
              className="btn secondary"
              onClick={() => api.exportFile("/api/export/content.xlsx", `content-${selectedMonth}.xlsx`)}
            >
              Excel export
            </button>
          }
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kontent nomi</th>
                <th>Joylash sanasi</th>
                <th>Holati</th>
                <th>Platforma</th>
                <th>Kontent turi</th>
                <th>Mas’ul / Video</th>
                <th>Bonus</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="empty-cell">Yuklanmoqda...</td></tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{formatDate(row.publish_date)}</td>
                    <td>{row.status}</td>
                    <td>{row.platform || "-"}</td>
                    <td>{row.content_type || "-"}</td>
                    <td>
                      {row.content_type === "video"
                        ? `${row.video_editor_name || "-"} / ${row.video_face_name || "-"}`
                        : row.assignee_name || "-"}
                    </td>
                    <td>{row.bonus_enabled ? "Ha" : "Yo‘q"}</td>
                    <td>
                      <IconActions
                        onView={() => setViewRow(row)}
                        onEdit={() => startEdit(row)}
                        onDelete={() => removeRow(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="empty-cell">Bu oy uchun reja yo‘q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Kontent reja tafsiloti">
        {viewRow ? (
          <div className="detail-grid">
            <div><strong>Kontent nomi:</strong> {viewRow.title}</div>
            <div><strong>Sana:</strong> {formatDate(viewRow.publish_date)}</div>
            <div><strong>Holati:</strong> {viewRow.status}</div>
            <div><strong>Platforma:</strong> {viewRow.platform || "-"}</div>
            <div><strong>Turi:</strong> {viewRow.content_type || "-"}</div>
            <div><strong>Bonus:</strong> {viewRow.bonus_enabled ? "Ha" : "Yo‘q"}</div>
            <div><strong>Taklif soni:</strong> {viewRow.proposal_count || 0}</div>
            <div><strong>Tasdiq soni:</strong> {viewRow.approved_count || 0}</div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function BonusPage({ bonusItems = [], users = [], branches = [], onToast, reload }) {
  const [monthFilter, setMonthFilter] = useState(getMonthLabel());
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const emptyForm = {
    title: "",
    work_date: "",
    content_type: "post",
    user_id: "",
    editor_user_id: "",
    face_voice_user_id: "",
    branch_id: "",
    proposal_count: "",
    approved_count: ""
  };

  const [form, setForm] = useState(emptyForm);
  const isVideo = form.content_type === "video";
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const monthOptions = [...new Set(
    [getMonthLabel(), ...(bonusItems || []).map((i) => i.month_label || formatDate(i.work_date).slice(0, 7)).filter(Boolean)]
  )];

  const filteredItems = bonusItems.filter((item) =>
    monthFilter ? (item.month_label || formatDate(item.work_date).slice(0, 7)) === monthFilter : true
  );

  const totalProposalAmount = filteredItems.reduce((sum, item) => sum + Number(item.proposal_amount || 0), 0);
  const totalApprovedAmount = filteredItems.reduce((sum, item) => sum + Number(item.approved_amount || 0), 0);
  const totalAmount = filteredItems.reduce((sum, item) => sum + Number(item.total_amount || item.amount || 0), 0);

  const employeeStatsMap = new Map();

  filteredItems.forEach((item) => {
    const add = (name, amount) => {
      if (!name || name === "-") return;
      if (!employeeStatsMap.has(name)) employeeStatsMap.set(name, 0);
      employeeStatsMap.set(name, employeeStatsMap.get(name) + Number(amount || 0));
    };

    if (item.content_type === "video") {
      add(item.video_editor_name || "-", Number(item.total_amount || item.amount || 0));
      add(item.video_face_name || "-", Number(item.total_amount || item.amount || 0));
    } else {
      add(item.full_name || "-", Number(item.total_amount || item.amount || 0));
    }
  });

  const employeeStats = [...employeeStatsMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      title: row.content_title || "",
      work_date: formatDate(row.work_date) === "-" ? "" : formatDate(row.work_date),
      content_type: row.content_type || "post",
      user_id: row.user_id || "",
      editor_user_id: row.video_editor_user_id || "",
      face_voice_user_id: row.video_face_user_id || "",
      branch_id: row.branch_id || "",
      proposal_count: row.proposal_count ?? "",
      approved_count: row.approved_count ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (isVideo) {
      if (!form.editor_user_id || !form.face_voice_user_id) {
        onToast("Video uchun 2 ta hodim tanlanishi kerak", "error");
        return;
      }
    } else {
      if (!form.user_id) {
        onToast("Hodimni tanlang", "error");
        return;
      }
    }

    if (!form.proposal_count) {
      onToast("Taklif soni majburiy", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        month_label: monthFilter,
        work_date: form.work_date,
        content_type: form.content_type,
        content_title: form.title,
        proposal_count: Number(form.proposal_count || 0),
        approved_count: Number(form.approved_count || 0),
        user_id: isVideo ? null : form.user_id || null,
        video_editor_user_id: isVideo ? form.editor_user_id || null : null,
        video_face_user_id: isVideo ? form.face_voice_user_id || null : null,
        branch_id: form.branch_id || null
      };

      if (editRow?.id) {
        await api.update("bonus-items", editRow.id, payload);
        onToast("Bonus hisobot yangilandi ✅", "success");
      } else {
        await api.create("bonus-items", payload);
        onToast("Bonus hisobot saqlandi ✅", "success");
      }

      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Saqlashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham o‘chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("bonus-items", id);
      await reload();
      onToast("Bonus yozuvi o‘chirildi", "success");
    } catch (err) {
      onToast(err.message || "O‘chirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title="Bonus tizimi"
          desc="Bonus hisobotlari va avtomatik hisob"
          right={
            <div className="toolbar-actions">
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>{getMonthTitle(m)}</option>
                ))}
              </select>

              {editRow ? (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}

              <button
                type="button"
                className="btn secondary"
                onClick={() => api.exportFile("/api/export/bonuses.xlsx", `bonuses-${monthFilter}.xlsx`)}
              >
                Excel export
              </button>
            </div>
          }
        />

        <div className="stats-grid">
          <StatCard title="Taklif summasi" value={formatMoney(totalProposalAmount)} hint="joriy oy" />
          <StatCard title="Tasdiq summasi" value={formatMoney(totalApprovedAmount)} hint="joriy oy" />
          <StatCard title="Jami bonus" value={formatMoney(totalAmount)} hint={getMonthTitle(monthFilter)} />
          <StatCard title="Yozuvlar soni" value={filteredItems.length} hint="bonus hisobotlar" />
        </div>
      </div>

      <div className="card">
        <SectionTitle title={editRow ? "Bonus hisobotni tahrirlash" : "Hisobot qo‘shish"} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Kontent nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label><span>Joylangan sanasi</span><input type="date" value={form.work_date} onChange={(e) => setField("work_date", e.target.value)} required /></label>
          <label>
            <span>Kontent turi</span>
            <select value={form.content_type} onChange={(e) => setField("content_type", e.target.value)}>
              <option value="post">Post</option>
              <option value="story">Story</option>
              <option value="reels">Reels</option>
              <option value="video">Video</option>
              <option value="banner">Banner</option>
            </select>
          </label>

          {isVideo ? (
            <>
              <label>
                <span>Montajni kim qildi</span>
                <select value={form.editor_user_id} onChange={(e) => setField("editor_user_id", e.target.value)}>
                  <option value="">Tanlang</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>

              <label>
                <span>Face + ovoz kimniki</span>
                <select value={form.face_voice_user_id} onChange={(e) => setField("face_voice_user_id", e.target.value)}>
                  <option value="">Tanlang</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label>
              <span>Hodim</span>
              <select value={form.user_id} onChange={(e) => setField("user_id", e.target.value)}>
                <option value="">Tanlang</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </label>
          )}

          <label>
            <span>Filial</span>
            <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)}>
              <option value="">Tanlang</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>

          <label><span>Taklif soni</span><input type="number" min="0" value={form.proposal_count} onChange={(e) => setField("proposal_count", e.target.value)} required /></label>
          <label><span>Tasdiq soni</span><input type="number" min="0" value={form.approved_count} onChange={(e) => setField("approved_count", e.target.value)} /></label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Hisobotni saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Hodim bo‘yicha bonus summalari" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hodim</th>
                <th>Jami bonus</th>
              </tr>
            </thead>
            <tbody>
              {employeeStats.length ? (
                employeeStats.map((row, idx) => (
                  <tr key={`${row.name}-${idx}`}>
                    <td>{row.name}</td>
                    <td>{formatMoney(row.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="2" className="empty-cell">Bu oy uchun bonus yo‘q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <SectionTitle title={`${getMonthTitle(monthFilter)} bonus yozuvlari`} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kontent nomi</th>
                <th>Sana</th>
                <th>Turi</th>
                <th>Hodim / Video</th>
                <th>Taklif</th>
                <th>Tasdiq</th>
                <th>Jami</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length ? (
                filteredItems.map((row) => (
                  <tr key={row.id}>
                    <td>{row.content_title || "-"}</td>
                    <td>{formatDate(row.work_date)}</td>
                    <td>{row.content_type || "-"}</td>
                    <td>
                      {row.content_type === "video"
                        ? `${row.video_editor_name || "-"} / ${row.video_face_name || "-"}`
                        : row.full_name || "-"}
                    </td>
                    <td>{row.proposal_count || 0}</td>
                    <td>{row.approved_count || 0}</td>
                    <td>{formatMoney(row.total_amount || row.amount || 0)}</td>
                    <td>
                      <IconActions
                        onView={() => setViewRow(row)}
                        onEdit={() => startEdit(row)}
                        onDelete={() => removeRow(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="empty-cell">Bu oy uchun bonus yozuvi yo‘q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Bonus yozuvi tafsiloti">
        {viewRow ? (
          <div className="detail-grid">
            <div><strong>Kontent nomi:</strong> {viewRow.content_title || "-"}</div>
            <div><strong>Sana:</strong> {formatDate(viewRow.work_date)}</div>
            <div><strong>Turi:</strong> {viewRow.content_type || "-"}</div>
            <div><strong>Taklif:</strong> {viewRow.proposal_count || 0}</div>
            <div><strong>Tasdiq:</strong> {viewRow.approved_count || 0}</div>
            <div><strong>Jami:</strong> {formatMoney(viewRow.total_amount || viewRow.amount || 0)}</div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function DailyReportsPage({ reports = [], branches = [], onToast, reload }) {
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const emptyForm = {
    report_date: "",
    branch_id: "",
    stories_count: 0,
    posts_count: 0,
    reels_count: 0,
    subscriber_count: 0,
    condition_text: "",
    notes: ""
  };

  const [form, setForm] = useState(emptyForm);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredReports = filterDate
    ? reports.filter((row) => formatDate(row.report_date) === filterDate)
    : reports;

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      report_date: formatDate(row.report_date) === "-" ? "" : formatDate(row.report_date),
      branch_id: row.branch_id || "",
      stories_count: row.stories_count || 0,
      posts_count: row.posts_count || 0,
      reels_count: row.reels_count || 0,
      subscriber_count: row.subscriber_count || 0,
      condition_text: row.condition_text || "",
      notes: row.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editRow?.id) {
        await api.update("daily-reports", editRow.id, form);
        onToast("Hisobot yangilandi ✅", "success");
      } else {
        await api.create("daily-reports", form);
        onToast("Saqlandi ✅", "success");
      }
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham o‘chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("daily-reports", id);
      await reload();
      onToast("Hisobot o‘chirildi", "success");
    } catch (err) {
      onToast(err.message || "O‘chirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title={editRow ? "Kunlik hisobotni tahrirlash" : "Kunlik filial hisobotlari"}
          right={
            <div className="toolbar-actions">
              {editRow ? (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}
              <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/daily-reports.xlsx", "daily-reports.xlsx")}>
                Excel export
              </button>
              <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/daily-reports.pdf", "daily-reports.pdf")}>
                PDF export
              </button>
            </div>
          }
        />

        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Sana</span><input type="date" value={form.report_date} onChange={(e) => setField("report_date", e.target.value)} required /></label>

          <label>
            <span>Filial</span>
            <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)} required>
              <option value="">Tanlang</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>

          <label><span>Stories</span><input type="number" min="0" value={form.stories_count} onChange={(e) => setField("stories_count", Number(e.target.value))} /></label>
          <label><span>Post</span><input type="number" min="0" value={form.posts_count} onChange={(e) => setField("posts_count", Number(e.target.value))} /></label>
          <label><span>Reels</span><input type="number" min="0" value={form.reels_count} onChange={(e) => setField("reels_count", Number(e.target.value))} /></label>
          <label><span>Obunachi soni</span><input type="number" min="0" value={form.subscriber_count} onChange={(e) => setField("subscriber_count", Number(e.target.value))} /></label>
          <label><span>AXVAT</span><input value={form.condition_text} onChange={(e) => setField("condition_text", e.target.value)} /></label>
          <label className="full-col"><span>Izoh</span><input value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Hisobotni saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle
          title="Kiritilgan hisobotlar"
          right={<input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Filial</th>
                <th>Stories</th>
                <th>Post</th>
                <th>Reels</th>
                <th>Obunachi soni</th>
                <th>AXVAT</th>
                <th>Izoh</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length ? (
                filteredReports.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.report_date)}</td>
                    <td>{row.branch_name}</td>
                    <td>{row.stories_count}</td>
                    <td>{row.posts_count}</td>
                    <td>{row.reels_count}</td>
                    <td>{row.subscriber_count || 0}</td>
                    <td>{row.condition_text || "-"}</td>
                    <td>{row.notes || "-"}</td>
                    <td>
                      <IconActions
                        onView={() => setViewRow(row)}
                        onEdit={() => startEdit(row)}
                        onDelete={() => removeRow(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="9" className="empty-cell">Hozircha ma’lumot yo‘q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Hisobot tafsiloti">
        {viewRow ? (
          <div className="detail-grid">
            <div><strong>Sana:</strong> {formatDate(viewRow.report_date)}</div>
            <div><strong>Filial:</strong> {viewRow.branch_name}</div>
            <div><strong>Stories:</strong> {viewRow.stories_count}</div>
            <div><strong>Post:</strong> {viewRow.posts_count}</div>
            <div><strong>Reels:</strong> {viewRow.reels_count}</div>
            <div><strong>Obunachi soni:</strong> {viewRow.subscriber_count || 0}</div>
            <div><strong>AXVAT:</strong> {viewRow.condition_text || "-"}</div>
            <div><strong>Izoh:</strong> {viewRow.notes || "-"}</div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function CampaignsPage({ campaigns = [], onToast, reload }) {
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const emptyForm = {
    title: "",
    platform: "",
    start_date: "",
    end_date: "",
    budget: 0,
    spend: 0,
    leads: 0,
    sales: 0,
    ctr: 0,
    revenue_amount: 0,
    status: "active",
    notes: ""
  };

  const [form, setForm] = useState(emptyForm);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      title: row.title || "",
      platform: row.platform || "",
      start_date: formatDate(row.start_date) === "-" ? "" : formatDate(row.start_date),
      end_date: formatDate(row.end_date) === "-" ? "" : formatDate(row.end_date),
      budget: row.budget || 0,
      spend: row.spend || 0,
      leads: row.leads || 0,
      sales: row.sales || 0,
      ctr: row.ctr || 0,
      revenue_amount: row.revenue_amount || 0,
      status: row.status || "active",
      notes: row.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editRow?.id) {
        await api.update("campaigns", editRow.id, form);
        onToast("Kampaniya yangilandi ✅", "success");
      } else {
        await api.create("campaigns", form);
        onToast("Kampaniya saqlandi ✅", "success");
      }
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham o‘chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("campaigns", id);
      await reload();
      onToast("Kampaniya o‘chirildi", "success");
    } catch (err) {
      onToast(err.message || "O‘chirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title={editRow ? "Reklama kampaniyasini tahrirlash" : "Reklama kampaniyasi"}
          right={
            <div className="toolbar-actions">
              {editRow ? (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}
              <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/campaigns.xlsx", "campaigns.xlsx")}>
                Excel export
              </button>
            </div>
          }
        />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Kampaniya nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label><span>Platforma</span><input value={form.platform} onChange={(e) => setField("platform", e.target.value)} required /></label>
          <label><span>Start sana</span><input type="date" value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} /></label>
          <label><span>End sana</span><input type="date" value={form.end_date} onChange={(e) => setField("end_date", e.target.value)} /></label>
          <label><span>Byudjet</span><input type="number" value={form.budget} onChange={(e) => setField("budget", Number(e.target.value))} /></label>
          <label><span>Sarf</span><input type="number" value={form.spend} onChange={(e) => setField("spend", Number(e.target.value))} /></label>
          <label><span>Lead</span><input type="number" value={form.leads} onChange={(e) => setField("leads", Number(e.target.value))} /></label>
          <label><span>Sotuv</span><input type="number" value={form.sales} onChange={(e) => setField("sales", Number(e.target.value))} /></label>
          <label><span>CTR</span><input type="number" value={form.ctr} onChange={(e) => setField("ctr", Number(e.target.value))} /></label>
          <label><span>Daromad</span><input type="number" value={form.revenue_amount} onChange={(e) => setField("revenue_amount", Number(e.target.value))} /></label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="done">done</option>
            </select>
          </label>
          <label className="full-col"><span>Izoh</span><input value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></label>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Kampaniya qo‘shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Kampaniyalar ro‘yxati" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kampaniya</th>
                <th>Platforma</th>
                <th>Byudjet</th>
                <th>Sarf</th>
                <th>ROI</th>
                <th>CTR</th>
                <th>CPA</th>
                <th>Status</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length ? (
                campaigns.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.platform}</td>
                    <td>{row.budget}</td>
                    <td>{row.spend}</td>
                    <td>{row.roi}</td>
                    <td>{row.ctr}</td>
                    <td>{row.cpa}</td>
                    <td>{row.status}</td>
                    <td>
                      <IconActions
                        onView={() => setViewRow(row)}
                        onEdit={() => startEdit(row)}
                        onDelete={() => removeRow(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="9" className="empty-cell">Hozircha ma’lumot yo‘q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Kampaniya tafsiloti">
        {viewRow ? (
          <div className="detail-grid">
            <div><strong>Nomi:</strong> {viewRow.title}</div>
            <div><strong>Platforma:</strong> {viewRow.platform}</div>
            <div><strong>Start:</strong> {formatDate(viewRow.start_date)}</div>
            <div><strong>End:</strong> {formatDate(viewRow.end_date)}</div>
            <div><strong>Byudjet:</strong> {viewRow.budget}</div>
            <div><strong>Sarf:</strong> {viewRow.spend}</div>
            <div><strong>Lead:</strong> {viewRow.leads}</div>
            <div><strong>Sotuv:</strong> {viewRow.sales}</div>
            <div><strong>CTR:</strong> {viewRow.ctr}</div>
            <div><strong>Status:</strong> {viewRow.status}</div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function MediaPage({ uploads = [], onToast, reload }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const filteredUploads = uploads.filter((u) => {
    const typeOk = typeFilter ? String(u.mime_type || "").toLowerCase().includes(typeFilter) : true;
    const searchOk = search
      ? String(u.original_name || "").toLowerCase().includes(search.toLowerCase())
      : true;
    return typeOk && searchOk;
  });

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);
      await api.upload(formData);
      await reload();
      setFile(null);
      onToast("Fayl yuklandi ✅", "success");
    } catch (err) {
      onToast(err.message || "Yuklashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham o‘chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("uploads", id);
      await reload();
      onToast("Fayl o‘chirildi", "success");
    } catch (err) {
      onToast(err.message || "O‘chirishda xatolik", "error");
    }
  }

  function isImage(mime) {
    return String(mime || "").startsWith("image/");
  }

  async function copyLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      onToast("Link nusxalandi ✅", "success");
    } catch {
      onToast("Linkni nusxalab bo‘lmadi", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title="Media kutubxona"
          right={
            <div className="toolbar-actions">
              <input placeholder="Qidiruv..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Barcha turlar</option>
                <option value="image">Rasm</option>
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
                <option value="sheet">Excel</option>
              </select>
            </div>
          }
        />
        <form className="upload-row" onSubmit={handleUpload}>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn primary" type="submit" disabled={!file || saving}>
            <Upload size={16} />
            {saving ? "Yuklanmoqda..." : "Yuklash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Yuklangan fayllar" />
        <div className="media-grid">
          {filteredUploads.length ? filteredUploads.map((row) => (
            <div className="media-card" key={row.id}>
              <div className="media-preview">
                {isImage(row.mime_type) ? (
                  <img src={row.file_url} alt={row.original_name} />
                ) : (
                  <div className="media-fallback">{row.mime_type || "file"}</div>
                )}
              </div>
              <div className="media-info">
                <div className="media-name">{row.original_name}</div>
                <div className="media-meta">{row.mime_type}</div>
                <div className="media-meta">{row.file_size}</div>
              </div>
              <div className="media-actions">
                <IconActions
                  onView={() => setViewRow(row)}
                  onEdit={null}
                  onDelete={() => removeRow(row.id)}
                />
                <div className="table-actions">
                  <a className="btn tiny secondary" href={row.file_url} target="_blank" rel="noreferrer">
                    Ochish
                  </a>
                  <button type="button" className="btn tiny secondary" onClick={() => copyLink(row.file_url)}>
                    Copy link
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-block">Hozircha media yo‘q</div>
          )}
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Media tafsiloti" wide>
        {viewRow ? (
          <div className="media-modal">
            {isImage(viewRow.mime_type) ? (
              <img src={viewRow.file_url} alt={viewRow.original_name} className="media-modal-image" />
            ) : (
              <a href={viewRow.file_url} target="_blank" rel="noreferrer" className="btn secondary">
                Faylni ochish
              </a>
            )}
            <div className="detail-grid">
              <div><strong>Nomi:</strong> {viewRow.original_name}</div>
              <div><strong>Turi:</strong> {viewRow.mime_type}</div>
              <div><strong>Hajmi:</strong> {viewRow.file_size}</div>
              <div className="full-col"><strong>Link:</strong> {viewRow.file_url}</div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function UsersPage({ users = [], onToast, reload }) {
  const emptyForm = {
    full_name: "",
    phone: "",
    login: "",
    password: "",
    role: "viewer",
    avatar_url: "",
    department_role: "",
    permissions_json: []
  };

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function togglePermission(permissionId) {
    setForm((prev) => {
      const current = Array.isArray(prev.permissions_json) ? prev.permissions_json : [];
      const exists = current.includes(permissionId);
      return {
        ...prev,
        permissions_json: exists ? current.filter((p) => p !== permissionId) : [...current, permissionId]
      };
    });
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      full_name: row.full_name || "",
      phone: row.phone || "",
      login: row.login || "",
      password: "",
      role: row.role || "viewer",
      avatar_url: row.avatar_url || "",
      department_role: row.department_role || "",
      permissions_json: safePermissions(row.permissions_json)
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);

      if (editingId) {
        await api.users.update(editingId, {
          full_name: form.full_name,
          phone: form.phone,
          login: form.login,
          role: form.role,
          avatar_url: form.avatar_url,
          department_role: form.department_role,
          permissions_json: form.permissions_json
        });
        onToast("Hodim yangilandi ✅", "success");
      } else {
        await api.create("users", form);
        onToast("Yangi hodim yaratildi ✅", "success");
      }

      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(id) {
    try {
      await api.users.resetPassword(id);
      onToast("Parol 12345678 ga tiklandi", "success");
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    }
  }

  async function toggleActive(id) {
    try {
      await api.users.toggleActive(id);
      await reload();
      onToast("Holat yangilandi", "success");
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham o‘chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("users", id);
      await reload();
      onToast("Hodim o‘chirildi", "success");
    } catch (err) {
      onToast(err.message || "O‘chirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title={editingId ? "Hodimni tahrirlash" : "Hodim yaratish"}
          right={
            <div className="toolbar-actions">
              <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/users.xlsx", "users.xlsx")}>
                Excel export
              </button>
              {editingId ? (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}
            </div>
          }
        />

        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Ism</span><input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} required /></label>
          <label><span>Telefon</span><input value={form.phone} onChange={(e) => setField("phone", e.target.value)} required /></label>
          <label>
            <span>Login</span>
            <input value={form.login} onChange={(e) => setField("login", e.target.value)} />
            <small className="field-note">Chatda yozish uchun `@{form.login || "username"}` ishlatiladi.</small>
          </label>

          {!editingId ? (
            <label><span>Parol</span><input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} required /></label>
          ) : (
            <label><span>Profil rasmi linki</span><input value={form.avatar_url} onChange={(e) => setField("avatar_url", e.target.value)} placeholder="https://..." /></label>
          )}

          <label>
            <span>Rol</span>
            <select value={form.role} onChange={(e) => setField("role", e.target.value)}>
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="editor">editor</option>
              <option value="mobilograf">mobilograf</option>
              <option value="viewer">viewer</option>
            </select>
          </label>

          <label><span>Lavozimi</span><input value={form.department_role} onChange={(e) => setField("department_role", e.target.value)} placeholder="Masalan: Mobilograf" /></label>

          {!editingId ? (
            <label><span>Profil rasmi linki</span><input value={form.avatar_url} onChange={(e) => setField("avatar_url", e.target.value)} placeholder="https://..." /></label>
          ) : (
            <div className="avatar-preview-box">
              {form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt="avatar"
                  className="avatar-preview"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="avatar-empty">Avatar</div>
              )}
            </div>
          )}

          <div className="full-col permission-box">
            <div className="permission-title">Qaysi menyularga kirishi mumkin</div>
            <div className="permission-grid">
              {PERMISSION_OPTIONS.map((item) => (
                <label key={item.id} className="permission-item">
                  <input
                    type="checkbox"
                    checked={(form.permissions_json || []).includes(item.id)}
                    onChange={() => togglePermission(item.id)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editingId ? "Yangilash" : "Hodim qo‘shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Hodimlar ro‘yxati" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Ism</th>
                <th>Telefon</th>
                <th>Login</th>
                <th>Rol</th>
                <th>Lavozim</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? (
                users.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.avatar_url ? (
                        <img src={row.avatar_url} alt={row.full_name} className="table-avatar" />
                      ) : (
                        <div className="table-avatar empty">?</div>
                      )}
                    </td>
                    <td>{row.full_name}</td>
                    <td>{row.phone}</td>
                    <td>{row.login || "-"}</td>
                    <td>{row.role}</td>
                    <td>{row.department_role || "-"}</td>
                    <td>{row.is_active ? "Faol" : "Bloklangan"}</td>
                    <td>
                      <div className="table-actions">
                        <IconActions
                          onView={() => setViewRow(row)}
                          onEdit={() => startEdit(row)}
                          onDelete={() => removeRow(row.id)}
                        />
                        <button type="button" className="btn tiny" onClick={() => resetPassword(row.id)}>Parol reset</button>
                        <button type="button" className="btn tiny secondary" onClick={() => toggleActive(row.id)}>
                          {row.is_active ? "Bloklash" : "Faollashtirish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="empty-cell">Hozircha ma’lumot yo‘q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Hodim tafsiloti">
        {viewRow ? (
          <div className="detail-grid">
            <div><strong>Ism:</strong> {viewRow.full_name}</div>
            <div><strong>Telefon:</strong> {viewRow.phone}</div>
            <div><strong>Login:</strong> {viewRow.login || "-"}</div>
            <div><strong>Rol:</strong> {viewRow.role}</div>
            <div><strong>Lavozim:</strong> {viewRow.department_role || "-"}</div>
            <div><strong>Holat:</strong> {viewRow.is_active ? "Faol" : "Bloklangan"}</div>
            <div className="full-col"><strong>Ruxsatlar:</strong> {safePermissions(viewRow.permissions_json).join(", ") || "-"}</div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function TasksPage({ tasks = [], users = [], user, onToast, reload }) {
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const isPrivileged = user?.role === "admin" || user?.role === "manager";

  const emptyForm = {
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    due_date: "",
    assignee_user_id: isPrivileged ? "" : user?.id || ""
  };

  const [form, setForm] = useState(emptyForm);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredTasks = filterDate
    ? tasks.filter((row) => formatDate(row.due_date) === filterDate)
    : tasks;

  function resetForm() {
    setForm({
      ...emptyForm,
      assignee_user_id: isPrivileged ? "" : user?.id || ""
    });
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      title: row.title || "",
      description: row.description || "",
      status: row.status || "todo",
      priority: row.priority || "medium",
      due_date: formatDate(row.due_date) === "-" ? "" : formatDate(row.due_date),
      assignee_user_id: isPrivileged ? row.assignee_user_id || "" : user?.id || row.assignee_user_id || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!isPrivileged) {
      setForm((prev) => ({ ...prev, assignee_user_id: user?.id || "" }));
    }
  }, [isPrivileged, user]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        assignee_user_id: isPrivileged ? form.assignee_user_id || null : user?.id || null
      };
      if (editRow?.id) {
        await api.update("tasks", editRow.id, payload);
        onToast("Vazifa yangilandi ✅", "success");
      } else {
        await api.create("tasks", payload);
        onToast("Vazifa saqlandi ✅", "success");
      }
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham o‘chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("tasks", id);
      await reload();
      onToast("Vazifa o‘chirildi", "success");
    } catch (err) {
      onToast(err.message || "O‘chirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title={editRow ? "Vazifani tahrirlash" : "Vazifa yaratish"}
          right={editRow ? <button type="button" className="btn secondary" onClick={resetForm}>Bekor qilish</button> : null}
        />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Vazifa</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="todo">Rejada</option>
              <option value="doing">Bajarilmoqda</option>
              <option value="done">Bajarilgan</option>
              <option value="cancelled">Bekor qilingan</option>
            </select>
          </label>
          <label>
            <span>Muhimlik</span>
            <select value={form.priority} onChange={(e) => setField("priority", e.target.value)}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label><span>Muddat</span><input type="date" value={form.due_date} onChange={(e) => setField("due_date", e.target.value)} /></label>
          <label>
            <span>Mas’ul</span>
            <select value={form.assignee_user_id} onChange={(e) => setField("assignee_user_id", e.target.value)}>
              <option value="">Tanlang</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </label>
          <label className="full-col"><span>Izoh</span><input value={form.description} onChange={(e) => setField("description", e.target.value)} /></label>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Vazifa qo‘shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Vazifalar ro‘yxati" right={<input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vazifa</th>
                <th>Status</th>
                <th>Muhimlik</th>
                <th>Muddat</th>
                <th>Mas’ul</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length ? (
                filteredTasks.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td><span className={taskStatusClass(row.status)}>{taskStatusLabel(row.status)}</span></td>
                    <td><span className={priorityClass(row.priority)}>{row.priority}</span></td>
                    <td>{formatDate(row.due_date)}</td>
                    <td>{row.assignee_name || "-"}</td>
                    <td>
                      <IconActions
                        onView={() => setViewRow(row)}
                        onEdit={() => startEdit(row)}
                        onDelete={() => removeRow(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="empty-cell">Hozircha ma’lumot yo‘q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Vazifa tafsiloti">
        {viewRow ? (
          <div className="detail-grid">
            <div><strong>Vazifa:</strong> {viewRow.title}</div>
            <div><strong>Status:</strong> <span className={taskStatusClass(viewRow.status)}>{taskStatusLabel(viewRow.status)}</span></div>
            <div><strong>Muhimlik:</strong> <span className={priorityClass(viewRow.priority)}>{viewRow.priority}</span></div>
            <div><strong>Muddat:</strong> {formatDate(viewRow.due_date)}</div>
            <div><strong>Mas’ul:</strong> {viewRow.assignee_name || "-"}</div>
            <div className="full-col"><strong>Izoh:</strong> {viewRow.description || "-"}</div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function AuditPage({ logs = [] }) {
  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Audit log" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kim</th>
                <th>Amal</th>
                <th>Entity</th>
                <th>ID</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? (
                logs.map((row) => (
                  <tr key={row.id}>
                    <td>{row.full_name || "-"}</td>
                    <td>{row.action_type}</td>
                    <td>{row.entity_type}</td>
                    <td>{row.entity_id || "-"}</td>
                    <td>{formatDate(row.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="empty-cell">Hozircha ma’lumot yo‘q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChatPage({ user, users = [], threads = [], onToast, reload }) {
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!activeThread && threads.length) {
      setActiveThread(threads[0]);
    }
  }, [threads, activeThread]);

  useEffect(() => {
    async function loadMessages() {
      if (!activeThread?.other_user_id) {
        setMessages([]);
        return;
      }
      try {
        setLoading(true);
        const data = await api.list(`/api/messages/thread/${activeThread.other_user_id}`);
        setMessages(data || []);
        await reload();
      } catch (err) {
        onToast(err.message || "Xabarlarni olib bo'lmadi", "error");
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
    if (!activeThread?.other_user_id) return undefined;
    const timer = setInterval(loadMessages, 2000);
    return () => clearInterval(timer);
  }, [activeThread?.other_user_id]);

  function resolveMentionTarget(text) {
    const match = String(text || "").trim().match(/^@([a-zA-Z0-9._-]+)/);
    if (!match) return null;
    return users.find((item) => item.login && item.login.toLowerCase() === match[1].toLowerCase()) || null;
  }

  async function sendMessage(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    const mentionTarget = resolveMentionTarget(trimmed);
    const receiverId = activeThread?.other_user_id || mentionTarget?.id;
    if (!receiverId) {
      onToast("Xabar uchun @login yozing yoki chat tanlang", "error");
      return;
    }

    try {
      setSending(true);
      await api.create("messages", {
        receiver_user_id: receiverId,
        body: trimmed
      });
      setBody("");
      const targetThread =
        activeThread?.other_user_id === receiverId
          ? activeThread
          : threads.find((item) => item.other_user_id === receiverId) || {
              other_user_id: receiverId,
              other_user_name: mentionTarget?.full_name || "Yangi chat",
              other_user_login: mentionTarget?.login || ""
            };
      setActiveThread(targetThread);
      const data = await api.list(`/api/messages/thread/${receiverId}`);
      setMessages(data || []);
      await reload();
      onToast("Xabar yuborildi", "success");
    } catch (err) {
      onToast(err.message || "Xabar yuborib bo'lmadi", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card chat-page">
        <SectionTitle
          title="Chat"
          desc="@login bilan yangi xabar boshlasangiz ham bo'ladi"
          right={<div className="chat-hint">Javoblar real vaqt emas, sahifa yangilanganda yangilanadi</div>}
        />
        <div className="chat-layout">
          <div className="chat-threads">
            {threads.length ? threads.map((thread) => (
              <button
                key={thread.other_user_id}
                type="button"
                className={`thread-card ${activeThread?.other_user_id === thread.other_user_id ? "active" : ""}`}
                onClick={() => setActiveThread(thread)}
              >
                <div className="thread-avatar">
                  {thread.other_user_avatar ? (
                    <img src={thread.other_user_avatar} alt={thread.other_user_name} className="table-avatar" />
                  ) : (
                    <div className="table-avatar empty">{getAvatarFallback(thread.other_user_name)}</div>
                  )}
                </div>
                <div className="thread-copy">
                  <div className="thread-name">{thread.other_user_name}</div>
                  <div className="thread-preview">{thread.last_message || "Xabar yo'q"}</div>
                </div>
                {thread.unread_count ? <span className="count-badge">{thread.unread_count}</span> : null}
              </button>
            )) : <div className="empty-block">Hozircha chat yo'q</div>}
          </div>

          <div className="chat-window">
            <div className="chat-header">
              <strong>{activeThread?.other_user_name || "Chat tanlang"}</strong>
              {activeThread?.other_user_login ? <span>@{activeThread.other_user_login}</span> : null}
            </div>
            <div className="chat-messages">
              {loading ? <div className="empty-block">Yuklanmoqda...</div> : messages.length ? messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-bubble ${message.sender_user_id === user?.id ? "mine" : ""}`}
                >
                  <div>{message.body}</div>
                  <span>{formatDate(message.created_at)}</span>
                </div>
              )) : <div className="empty-block">Xabarlar yo'q</div>}
            </div>
            <form className="chat-form" onSubmit={sendMessage}>
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Xabar yozing yoki @login bilan boshlang"
              />
              <button type="submit" className="btn primary" disabled={sending}>
                <Send size={16} />
                {sending ? "Yuborilmoqda..." : "Yuborish"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user = {}, onToast, refreshUser }) {
  const [form, setForm] = useState({
    full_name: user.full_name || "",
    phone: user.phone || "",
    login: user.login || "",
    avatar_url: user.avatar_url || "",
    department_role: user.department_role || "",
    old_password: "",
    new_password: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      login: user.login || "",
      avatar_url: user.avatar_url || "",
      department_role: user.department_role || "",
      old_password: "",
      new_password: ""
    });
  }, [user]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateProfile({
        full_name: form.full_name,
        phone: form.phone,
        login: form.login,
        avatar_url: form.avatar_url,
        department_role: form.department_role
      });

      if (form.old_password && form.new_password) {
        await api.changePassword({
          old_password: form.old_password,
          new_password: form.new_password
        });
      }

      const me = await api.me();
      refreshUser(me.user);
      onToast("Profil saqlandi ✅", "success");
      setForm((prev) => ({
        ...prev,
        old_password: "",
        new_password: ""
      }));
    } catch (err) {
      onToast(err.message || "Profilni saqlab bo‘lmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Mening profilim" />
        <form className="form-grid" onSubmit={saveProfile}>
          <label><span>Ism</span><input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} /></label>
          <label><span>Telefon</span><input value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></label>
          <label><span>Login</span><input value={form.login} onChange={(e) => setField("login", e.target.value)} /></label>
          <label><span>Lavozimi</span><input value={form.department_role} onChange={(e) => setField("department_role", e.target.value)} /></label>
          <label className="full-col"><span>Profil rasmi linki</span><input value={form.avatar_url} onChange={(e) => setField("avatar_url", e.target.value)} /></label>
          <div className="full-col profile-avatar-line">
            {form.avatar_url ? <img src={form.avatar_url} alt="avatar" className="profile-avatar" /> : <div className="avatar-empty">Avatar</div>}
          </div>
          <label><span>Eski parol</span><input type="password" value={form.old_password} onChange={(e) => setField("old_password", e.target.value)} /></label>
          <label><span>Yangi parol</span><input type="password" value={form.new_password} onChange={(e) => setField("new_password", e.target.value)} /></label>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Profilni saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SettingsPage({ settings, onSave, saving, theme, setTheme }) {
  const [form, setForm] = useState(settings || {});

  useEffect(() => {
    setForm(settings || {});
  }, [settings]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Sozlamalar" right={<ThemeToggle theme={theme} setTheme={setTheme} />} />
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
        <div className="settings-logo-preview">
          <label className="full-col">
            <span>Logo rasmi linki</span>
            <input value={form.logo_url || ""} onChange={(e) => setField("logo_url", e.target.value)} placeholder="https://... yoki upload link" />
          </label>
          <div className="settings-logo-card">
            <img src={form.logo_url || LOGIN_LOGO} alt="Logo preview" className="settings-logo-image" />
            <div>
              <strong>{form.company_name || "aloo"}</strong>
              <span>{form.platform_name || "SMM jamoasi platformasi"}</span>
            </div>
          </div>
        </div>
        <button className="btn primary mt16" onClick={() => onSave(form)} disabled={saving}>
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(getCurrentUser());
  const [active, setActive] = useState("dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("aloo_theme") || "light");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [summary, setSummary] = useState({});
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [bonusItems, setBonusItems] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [contentRows, setContentRows] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [threads, setThreads] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const unreadChatCount = (threads || []).reduce((sum, thread) => sum + Number(thread.unread_count || 0), 0);

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
        bonusItemsRes,
        uploadsRes,
        contentRes,
        dailyReportsRes,
        campaignsRes,
        tasksRes,
        threadsRes,
        auditLogsRes
      ] = await Promise.all([
        api.dashboard().catch(() => ({})),
        api.settings.get().catch(() => null),
        api.list("notifications").catch(() => []),
        api.list("users").catch(() => []),
        api.list("branches").catch(() => []),
        api.list("bonus-items").catch(() => []),
        api.list("uploads").catch(() => []),
        api.list("content").catch(() => []),
        api.list("daily-reports").catch(() => []),
        api.list("campaigns").catch(() => []),
        api.list("tasks").catch(() => []),
        api.list("/api/messages/threads").catch(() => []),
        api.list("audit-logs").catch(() => [])
      ]);

      setSummary(dashboardRes || {});
      setSettings(settingsRes);
      setNotifications(notificationsRes || []);
      setUsers(usersRes || []);
      setBranches(branchesRes || []);
      setBonusItems(bonusItemsRes || []);
      setUploads(uploadsRes || []);
      setContentRows(contentRes || []);
      setDailyReports(dailyReportsRes || []);
      setCampaigns(campaignsRes || []);
      setTasks(tasksRes || []);
      setThreads(threadsRes || []);
      setAuditLogs(auditLogsRes || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    async function init() {
      if (!user) {
        const publicSettings = await api.settings.get().catch(() => null);
        setSettings(publicSettings);
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
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const intervalMs = active === "chat" ? 2500 : 7000;
    const timer = setInterval(() => {
      reloadData();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [user?.id, active]);

  const allowedMenu = useMemo(() => {
    if (user?.role === "admin") return MENU;
    const permissions = safePermissions(user?.permissions_json);
    if (!permissions.length) {
      return MENU.filter((item) => item.id === "dashboard" || item.id === "profile");
    }
    return MENU.filter((item) => permissions.includes(item.id));
  }, [user]);

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return allowedMenu;
    return allowedMenu.filter((item) =>
      item.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, allowedMenu]);

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
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleReadNotification(id) {
    try {
      await api.notifications.read(id);
      await reloadData();
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    }
  }

  async function handleReadAll() {
    try {
      await api.notifications.readAll();
      await reloadData();
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    }
  }

  function logout() {
    clearAuth();
    setUser(null);
    setActive("dashboard");
  }

  if (booting) {
    return <div className="loading-screen">Yuklanmoqda...</div>;
  }

  if (!user) {
    return (
      <>
        <LoginPage onLoggedIn={setUser} settings={settings} />
        <Toast toast={toast} onClose={() => setToast(null)} />
        <style>{styles}</style>
      </>
    );
  }

  let page = null;

  if (active === "dashboard") {
    page = (
      <DashboardPage
        summary={summary}
        dailyReports={dailyReports}
        bonusItems={bonusItems}
        contentRows={contentRows}
      />
    );
  } else if (active === "content") {
    page = <ContentPage users={users} onToast={showToast} reload={reloadData} />;
  } else if (active === "bonus") {
    page = <BonusPage bonusItems={bonusItems} users={users} branches={branches} onToast={showToast} reload={reloadData} />;
  } else if (active === "dailyReports") {
    page = <DailyReportsPage reports={dailyReports} branches={branches} onToast={showToast} reload={reloadData} />;
  } else if (active === "campaigns") {
    page = <CampaignsPage campaigns={campaigns} onToast={showToast} reload={reloadData} />;
  } else if (active === "uploads") {
    page = <MediaPage uploads={uploads} onToast={showToast} reload={reloadData} />;
  } else if (active === "users") {
    page = <UsersPage users={users} onToast={showToast} reload={reloadData} />;
  } else if (active === "tasks") {
    page = <TasksPage tasks={tasks} users={users} user={user} onToast={showToast} reload={reloadData} />;
  } else if (active === "chat") {
    page = <ChatPage user={user} users={users} threads={threads} onToast={showToast} reload={reloadData} />;
  } else if (active === "audit") {
    page = <AuditPage logs={auditLogs} />;
  } else if (active === "profile") {
    page = <ProfilePage user={user} onToast={showToast} refreshUser={setUser} />;
  } else if (active === "settings") {
    page = <SettingsPage settings={settings} onSave={saveSettings} saving={savingSettings} theme={theme} setTheme={setTheme} />;
  }

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark">
              <img src={settings?.logo_url || LOGIN_LOGO} alt="logo" className="brand-mark-image" />
            </div>
            <div>
              <div className="brand-name">{settings?.company_name || "aloo"}</div>
              <div className="brand-desc">{settings?.platform_name || "SMM jamoasi platformasi"}</div>
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
                <button
                  key={item.id}
                  className={`menu-btn ${active === item.id ? "active" : ""}`}
                  type="button"
                  onClick={() => setActive(item.id)}
                >
                  <span className="menu-icon-wrap">
                    <Icon size={16} />
                  </span>
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>

          <button className="logout-btn" type="button" onClick={logout}>
            <LogOut size={16} />
            Chiqish
          </button>
        </aside>

        <main className="main-area">
          <div className="topbar">
            <div>
              <div className="small-label">{(settings?.company_name || "aloo")} platforma</div>
              <h1>{MENU.find((m) => m.id === active)?.title || "Bosh sahifa"}</h1>
            </div>

            <div className="topbar-right">
              <button className="notif-pill" type="button" onClick={() => setActive("chat")}>
                <MessageCircle size={16} />
                {unreadChatCount}
              </button>
              <button className="notif-pill" type="button" onClick={() => setDrawerOpen(true)}>
                <Bell size={16} />
                {(notifications || []).filter((n) => !n.is_read).length}
              </button>
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <button type="button" className="user-chip" onClick={() => setActive("profile")}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="topbar-avatar" />
                ) : (
                  <div className="topbar-avatar fallback">{getAvatarFallback(user?.full_name)}</div>
                )}
                <span>{user?.full_name || "Foydalanuvchi"}</span>
              </button>
            </div>
          </div>

          {page}
        </main>
      </div>

      <NotificationsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={notifications}
        onRead={handleReadNotification}
        onReadAll={handleReadAll}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
      <style>{styles}</style>
    </>
  );
}

const styles = `
:root{
  --blue:#1690F5;
  --bg:#f5f8fc;
  --panel:#ffffff;
  --soft:#f6f9fd;
  --text:#101828;
  --muted:#667085;
  --line:#e5edf5;
  --black:#141414;
  --danger:#e11d48;
}
:root[data-theme='dark']{
  --blue:#1690F5;
  --bg:#0b1220;
  --panel:#111827;
  --soft:#1b2435;
  --text:#f8fbff;
  --muted:#97a6ba;
  --line:rgba(255,255,255,.08);
  --black:#141414;
  --danger:#fb7185;
}
*{box-sizing:border-box}
html,body,#root{margin:0;min-height:100%;font-family:Inter,Arial,sans-serif;background:var(--bg);color:var(--text)}
button,input,select,textarea{font:inherit}
input,select,textarea{outline:none}
a{color:var(--blue);text-decoration:none}
img{display:block;max-width:100%}

.loading-screen{min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text)}

.login-page{
  min-height:100vh;
  display:grid;
  grid-template-columns:1.15fr .85fr;
  gap:32px;
  padding:40px;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 12% 18%, rgba(56,189,248,.24), transparent 26%),
    radial-gradient(circle at 86% 20%, rgba(99,102,241,.18), transparent 22%),
    radial-gradient(circle at 78% 78%, rgba(29,78,216,.16), transparent 24%),
    linear-gradient(135deg,#eaf4ff 0%, #f8fbff 34%, #eef9f7 66%, #ecfeff 100%);
}
.login-particles{
  position:absolute;
  inset:0;
  pointer-events:none;
  overflow:hidden;
}
.login-particle{
  position:absolute;
  bottom:-40px;
  width:6px;
  height:6px;
  border-radius:999px;
  background:linear-gradient(135deg, rgba(56,189,248,.65), rgba(110,231,183,.35));
  box-shadow:0 0 18px rgba(56,189,248,.35);
  opacity:.45;
  animation:particle-rise linear infinite;
}
.login-copy{
  display:flex;
  flex-direction:column;
  justify-content:center;
  position:relative;
  z-index:2;
  animation:login-fade-up .7s ease;
}
.brand-kicker{
  display:inline-flex;
  width:max-content;
  padding:10px 16px;
  border-radius:999px;
  background:rgba(255,255,255,.64);
  backdrop-filter:blur(10px);
  border:1px solid rgba(22,144,245,.18);
  color:var(--blue);
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.16em;
  box-shadow:0 14px 30px rgba(22,144,245,.08);
}
.login-copy h1{
  font-size:68px;
  margin:18px 0 0;
  line-height:.98;
  letter-spacing:-.04em;
}
.login-copy h2{
  font-size:32px;
  line-height:1.12;
  margin:18px 0 0;
  max-width:760px;
}
.login-copy p{color:var(--muted);font-size:18px;max-width:620px;line-height:1.6}
.login-logo-lockup{
  display:flex;
  align-items:center;
  gap:16px;
  margin-top:26px;
  margin-bottom:4px;
}
.login-logo-image{
  width:78px;
  height:78px;
  border-radius:26px;
  box-shadow:0 18px 34px rgba(29,78,216,.18);
}
.login-logo-copy{
  display:grid;
  gap:4px;
}
.login-logo-copy strong{
  font-size:22px;
  line-height:1;
}
.login-logo-copy span{
  color:var(--muted);
  font-size:14px;
}
.login-feature-row{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,220px));
  gap:14px;
  margin-top:28px;
}
.login-feature-card{
  padding:16px 18px;
  border-radius:22px;
  background:rgba(255,255,255,.58);
  border:1px solid rgba(255,255,255,.75);
  backdrop-filter:blur(14px);
  box-shadow:0 18px 36px rgba(30,41,59,.06);
  animation:login-float 5s ease-in-out infinite;
}
.login-feature-card:nth-child(2){animation-delay:-2.2s}
.login-feature-card strong{display:block;font-size:16px;margin-bottom:6px}
.login-feature-card span{color:var(--muted);font-size:14px;line-height:1.5}
.login-card{
  align-self:center;
  justify-self:end;
  width:min(100%, 560px);
  position:relative;
  z-index:2;
  overflow:hidden;
  background:rgba(255,255,255,.68);
  backdrop-filter:blur(18px);
  border:1px solid rgba(255,255,255,.72);
  border-radius:34px;
  padding:30px;
  display:grid;
  gap:16px;
  box-shadow:0 24px 60px rgba(20,86,140,.12);
  animation:login-card-in .75s cubic-bezier(.2,.9,.2,1);
}
.login-card-shine{
  position:absolute;
  inset:-20% auto auto -30%;
  width:180px;
  height:180px;
  background:radial-gradient(circle, rgba(255,255,255,.72), transparent 70%);
  opacity:.85;
  animation:login-shine 7s linear infinite;
  pointer-events:none;
}
.small-label{font-size:12px;color:var(--muted);letter-spacing:.16em;text-transform:uppercase}
.login-title{font-size:30px;font-weight:800}
.login-card label{display:grid;gap:8px}
.login-card label span{font-size:13px;color:var(--muted)}
.login-card input{
  background:rgba(248,251,255,.9);
  border:1px solid rgba(22,144,245,.12);
  color:var(--text);
  border-radius:18px;
  padding:15px 16px;
  transition:border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.login-card input:focus{
  border-color:rgba(22,144,245,.45);
  box-shadow:0 0 0 4px rgba(22,144,245,.12), 0 14px 30px rgba(56,189,248,.12);
  transform:translateY(-1px);
}
.login-card .btn.primary{
  position:relative;
  overflow:hidden;
  min-height:54px;
}
.login-card .btn.primary::after{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(120deg, transparent 20%, rgba(255,255,255,.28) 50%, transparent 80%);
  transform:translateX(-130%);
  animation:button-shimmer 2.8s infinite;
}
.login-orb{
  position:absolute;
  border-radius:50%;
  filter:blur(10px);
  opacity:.9;
  pointer-events:none;
}
.orb-one{
  width:280px;
  height:280px;
  top:-60px;
  right:22%;
  background:radial-gradient(circle, rgba(56,189,248,.30), rgba(29,78,216,.10) 60%, transparent 72%);
  animation:login-float 7s ease-in-out infinite;
}
.orb-two{
  width:360px;
  height:360px;
  left:-80px;
  bottom:-120px;
  background:radial-gradient(circle, rgba(110,231,183,.28), rgba(56,189,248,.08) 58%, transparent 74%);
  animation:login-float 9s ease-in-out infinite reverse;
}
.login-grid-line{
  position:absolute;
  inset:0;
  background-image:
    linear-gradient(rgba(37,99,235,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37,99,235,.04) 1px, transparent 1px);
  background-size:34px 34px;
  mask-image:radial-gradient(circle at center, black 36%, transparent 88%);
  pointer-events:none;
}
.login-loading{
  position:absolute;
  inset:0;
  background:rgba(255,255,255,.58);
  backdrop-filter:blur(8px);
  z-index:4;
  display:grid;
  place-items:center;
  gap:12px;
  text-align:center;
  color:var(--text);
}
.login-loading span{
  font-size:14px;
  color:var(--muted);
}
.login-loader-ring{
  width:58px;
  height:58px;
  border-radius:50%;
  border:4px solid rgba(29,78,216,.12);
  border-top-color:#1d4ed8;
  border-right-color:#38bdf8;
  animation:login-spin 1s linear infinite;
  box-shadow:0 0 0 8px rgba(56,189,248,.08);
}

.app-shell{
  min-height:100vh;
  display:grid;
  grid-template-columns:280px 1fr;
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
.brand-block{display:flex;align-items:center;gap:12px}
.brand-mark{
  width:56px;height:56px;border-radius:20px;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.35), transparent 38%),
    linear-gradient(135deg,#1d4ed8,#38bdf8 55%,#6ee7b7);
  color:#fff;display:grid;place-items:center;font-size:26px;font-weight:900;
  box-shadow:0 16px 30px rgba(29,78,216,.22);
  overflow:hidden;
}
.brand-mark-image{width:100%;height:100%;object-fit:cover}
.brand-name{font-size:24px;font-weight:800}
.brand-desc{font-size:12px;color:var(--muted)}
.settings-logo-preview{margin-top:18px;display:grid;gap:14px}
.settings-logo-card{
  display:flex;align-items:center;gap:14px;
  padding:16px 18px;border-radius:20px;
  background:linear-gradient(135deg, rgba(255,255,255,.88), rgba(235,246,255,.84));
  border:1px solid var(--line);
  box-shadow:0 16px 34px rgba(29,78,216,.08);
}
.settings-logo-card strong{display:block;font-size:18px;margin-bottom:4px}
.settings-logo-card span{color:var(--muted);font-size:13px}
.settings-logo-image{
  width:62px;height:62px;object-fit:cover;border-radius:18px;
  box-shadow:0 14px 28px rgba(29,78,216,.18);
}

.sidebar-search{
  display:flex;align-items:center;gap:10px;
  background:linear-gradient(180deg, rgba(255,255,255,.92), var(--soft));
  border:1px solid var(--line);
  border-radius:16px;
  padding:12px 14px;
}
.sidebar-search input{
  width:100%;
  background:transparent;
  border:0;
  color:var(--text);
}

.menu-list{display:grid;gap:10px}
.menu-btn{
  border:1px solid transparent;
  background:linear-gradient(180deg, rgba(255,255,255,.9), rgba(246,249,253,.75));
  color:var(--text);
  padding:14px 16px;
  border-radius:16px;
  display:flex;align-items:center;gap:10px;
  cursor:pointer;
  text-align:left;
  font-weight:700;
  transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease;
}
.menu-btn:hover{
  background:linear-gradient(180deg, rgba(235,245,255,.95), rgba(241,248,255,.9));
  border-color:rgba(22,144,245,.18);
  transform:translateX(2px);
}
.menu-btn.active{
  background:linear-gradient(135deg,rgba(22,144,245,.14),rgba(98,210,255,.14),rgba(110,231,183,.12));
  border-color:rgba(22,144,245,.28);
  box-shadow:0 14px 28px rgba(22,144,245,.10);
}
.menu-icon-wrap{
  width:34px;
  height:34px;
  border-radius:12px;
  display:grid;
  place-items:center;
  background:linear-gradient(180deg, rgba(255,255,255,.98), rgba(228,240,255,.9));
  border:1px solid rgba(22,144,245,.12);
  color:#2563eb;
}
.menu-btn.active .menu-icon-wrap{
  background:linear-gradient(135deg,#1d4ed8,#38bdf8);
  color:#fff;
  border-color:transparent;
}

.logout-btn{
  margin-top:auto;
  border:0;
  border-radius:16px;
  padding:14px 16px;
  background:
    radial-gradient(circle at 12% 20%, rgba(255,0,153,.35), transparent 18%),
    linear-gradient(135deg,#0f172a,#111827 60%,#020617);
  color:#fff;
  display:flex;align-items:center;justify-content:center;gap:8px;
  cursor:pointer;
  box-shadow:0 18px 34px rgba(2,6,23,.22);
}

.main-area{padding:24px}
.topbar{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:20px 22px;
  display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
}
.topbar h1{margin:8px 0 0;font-size:34px}
.topbar-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}

.theme-toggle,.notif-pill,.user-chip{
  border:1px solid var(--line);
  background:var(--soft);
  color:var(--text);
  border-radius:14px;
  padding:12px 14px;
  display:flex;align-items:center;gap:8px;
}
.notif-pill,.user-chip{cursor:pointer}
.topbar-avatar{
  width:28px;
  height:28px;
  border-radius:50%;
  object-fit:cover;
  border:1px solid var(--line);
}
.topbar-avatar.fallback{
  display:grid;
  place-items:center;
  background:var(--panel);
  font-size:12px;
  font-weight:800;
}

.page-grid{display:grid;gap:18px;margin-top:18px}
.hero-banner,.card,.stat-card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:22px;
  animation:panel-in .4s ease;
  transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.card:hover,.stat-card:hover{
  transform:translateY(-2px);
  box-shadow:0 18px 36px rgba(15,23,42,.06);
}
.hero-banner h1{font-size:44px;line-height:1.05;margin:10px 0}
.hero-banner p{color:var(--muted);font-size:17px;max-width:720px}
.stats-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:18px;
}
.stat-card-title{font-size:14px;color:var(--muted)}
.stat-card-value{font-size:36px;font-weight:900;margin-top:10px}
.stat-card-hint{font-size:13px;color:var(--muted);margin-top:8px}

.two-grid{
  display:grid;
  grid-template-columns:1.1fr .9fr;
  gap:18px;
}
.quick-list{display:grid;gap:12px}
.quick-item{
  padding:14px 16px;
  background:var(--soft);
  border:1px solid var(--line);
  border-radius:16px;
  display:flex;justify-content:space-between;gap:10px
}

.section-title-row{
  display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
  margin-bottom:16px;
}
.section-title-row h2{margin:0;font-size:26px}
.section-title-row p{margin:8px 0 0;color:var(--muted)}
.toolbar-actions{display:flex;gap:8px;flex-wrap:wrap}

.form-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:14px;
}
.form-grid label{display:grid;gap:8px}
.form-grid label span{font-size:13px;color:var(--muted)}
.field-note{font-size:12px;color:var(--muted)}
.form-grid input,.form-grid select,.form-grid textarea{
  background:var(--soft);
  border:1px solid var(--line);
  color:var(--text);
  border-radius:14px;
  padding:13px 14px;
}
.full-col{grid-column:1 / -1}
.mt16{margin-top:16px}

.btn{
  border:0;
  border-radius:14px;
  padding:12px 14px;
  cursor:pointer;
  font-weight:700;
  display:inline-flex;
  align-items:center;
  gap:8px;
}
.btn.primary{
  background:linear-gradient(135deg,var(--blue),#62d2ff);
  color:#fff;
}
.btn.secondary{
  background:var(--soft);
  border:1px solid var(--line);
  color:var(--text);
}
.btn.large{padding:14px 16px}
.btn.tiny{padding:8px 10px;font-size:12px}
.link-btn{
  border:0;background:transparent;color:var(--blue);cursor:pointer;padding:0
}

.summary-pill{
  margin-bottom:16px;
  padding:14px 16px;
  border-radius:16px;
  background:var(--soft);
  border:1px solid var(--line);
}

.upload-row{
  display:flex;gap:12px;align-items:center;flex-wrap:wrap
}
.upload-row input[type="file"]{
  background:var(--soft);
  border:1px solid var(--line);
  border-radius:14px;
  padding:12px;
  color:var(--text);
}

.table-wrap{
  overflow:auto;
  border:1px solid var(--line);
  border-radius:16px;
}
table{width:100%;border-collapse:collapse}
th,td{padding:12px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
th{background:rgba(22,144,245,.05);color:var(--muted)}
.empty-cell{text-align:center;color:var(--muted);padding:24px}
.table-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}

.error-box{
  background:rgba(239,90,90,.10);
  color:#db4f4f;
  border:1px solid rgba(239,90,90,.18);
  padding:12px 14px;
  border-radius:14px;
}

.toast{
  position:fixed;
  right:20px;bottom:20px;
  min-width:320px;
  display:flex;justify-content:space-between;align-items:center;gap:14px;
  padding:16px 18px;
  border-radius:22px;
  color:#fff;
  z-index:9999;
  box-shadow:0 24px 50px rgba(0,0,0,.25);
  overflow:hidden;
  animation:toast-in .35s ease;
}
.toast-success{background:linear-gradient(135deg,#0f9b5f,#4fd1c5)}
.toast-error{background:linear-gradient(135deg,#ef4444,#fb7185)}
.toast-glow{
  position:absolute;
  inset:auto -40px -40px auto;
  width:140px;
  height:140px;
  border-radius:50%;
  background:rgba(255,255,255,.18);
  filter:blur(8px);
}
.toast-copy{
  position:relative;
  z-index:1;
  display:grid;
  gap:4px;
}
.toast-copy strong{font-size:13px;letter-spacing:.08em;text-transform:uppercase}
.toast-copy span{font-size:15px}
.toast button{
  position:relative;
  z-index:1;
  background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.18);
  color:#fff;
  cursor:pointer;
  width:34px;
  height:34px;
  border-radius:12px;
}
@keyframes toast-in{
  from{transform:translateY(24px) scale(.94);opacity:0}
  to{transform:translateY(0) scale(1);opacity:1}
}

.drawer{
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:9998;
}
.drawer.open{pointer-events:auto}
.drawer-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.28);
  opacity:0;
  transition:.2s;
}
.drawer.open .drawer-backdrop{opacity:1}
.drawer-panel{
  position:absolute;
  top:0;right:0;
  width:min(420px,92vw);
  height:100%;
  background:var(--panel);
  border-left:1px solid var(--line);
  transform:translateX(100%);
  transition:.24s;
  padding:20px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.drawer.open .drawer-panel{transform:translateX(0)}
.drawer-head{
  display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap
}
.drawer-head h3{margin:6px 0 0;font-size:24px}
.drawer-list{display:grid;gap:12px;overflow:auto}
.notif-card{
  padding:14px 16px;
  border-radius:16px;
  border:1px solid var(--line);
  background:var(--soft);
}
.notif-card.read{opacity:.7}
.notif-title{font-weight:800}
.notif-body{margin-top:6px;color:var(--muted)}
.notif-footer{margin-top:10px;display:flex;justify-content:space-between;gap:10px;align-items:center}
.empty-block{
  padding:18px;
  border:1px dashed var(--line);
  border-radius:16px;
  color:var(--muted);
  text-align:center;
}

.checkbox-row{
  display:flex !important;
  align-items:center;
  gap:10px;
  min-height:48px;
}
.checkbox-row input{
  width:18px;
  height:18px;
}

.permission-box{
  border:1px solid var(--line);
  border-radius:16px;
  padding:16px;
  background:var(--soft);
}
.permission-title{
  font-weight:800;
  margin-bottom:12px;
}
.permission-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:10px;
}
.permission-item{
  display:flex !important;
  align-items:center;
  gap:8px;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:12px;
  padding:10px 12px;
}
.permission-item input{
  width:16px;
  height:16px;
}
.status-badge,.priority-badge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:92px;
  padding:6px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:800;
  text-transform:capitalize;
}
.status-badge.todo{background:rgba(148,163,184,.18);color:#64748b}
.status-badge.doing{background:rgba(59,130,246,.14);color:#2563eb}
.status-badge.done{background:rgba(34,197,94,.14);color:#16a34a}
.status-badge.cancelled{background:rgba(239,68,68,.14);color:#dc2626}
.priority-badge.low{background:rgba(34,197,94,.14);color:#16a34a}
.priority-badge.medium{background:rgba(245,158,11,.14);color:#d97706}
.priority-badge.high{background:rgba(239,68,68,.14);color:#dc2626}

.icon-actions{
  display:flex;
  gap:8px;
  align-items:center;
}
.icon-btn{
  border:1px solid var(--line);
  background:var(--soft);
  color:var(--text);
  width:34px;
  height:34px;
  border-radius:10px;
  display:grid;
  place-items:center;
  cursor:pointer;
}
.icon-btn.danger{
  color:var(--danger);
}

.modal-wrap{
  position:fixed;
  inset:0;
  z-index:10000;
}
.modal-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.35);
}
.modal-card{
  position:relative;
  z-index:2;
  width:min(720px, calc(100vw - 32px));
  margin:48px auto;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:20px;
}
.modal-card.wide{
  width:min(980px, calc(100vw - 32px));
}
.modal-head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  margin-bottom:16px;
}
.modal-head h3{
  margin:0;
  font-size:24px;
}
.modal-body{
  max-height:75vh;
  overflow:auto;
}
.detail-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:12px;
}
.media-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:14px;
}
.media-card{
  border:1px solid var(--line);
  border-radius:18px;
  overflow:hidden;
  background:var(--soft);
}
.media-preview{
  height:180px;
  background:var(--panel);
  display:grid;
  place-items:center;
  overflow:hidden;
}
.media-preview img{
  width:100%;
  height:100%;
  object-fit:cover;
}
.media-fallback{
  font-size:13px;
  color:var(--muted);
  padding:10px;
  text-align:center;
}
.media-info{
  padding:12px;
}
.media-name{
  font-weight:800;
  word-break:break-word;
}
.media-meta{
  font-size:12px;
  color:var(--muted);
  margin-top:6px;
}
.media-actions{
  padding:12px;
  display:flex;
  justify-content:space-between;
  gap:8px;
  align-items:center;
}
.media-modal{
  display:grid;
  gap:16px;
}
.media-modal-image{
  max-height:420px;
  width:100%;
  object-fit:contain;
  background:var(--soft);
  border-radius:16px;
}
.avatar-preview-box{
  display:flex;
  align-items:center;
}
.avatar-preview,
.profile-avatar,
.table-avatar{
  width:52px;
  height:52px;
  border-radius:50%;
  object-fit:cover;
  border:1px solid var(--line);
}
.table-avatar.empty{
  display:grid;
  place-items:center;
  background:var(--soft);
}
.avatar-empty{
  width:52px;
  height:52px;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:var(--soft);
  border:1px solid var(--line);
  color:var(--muted);
}
.profile-avatar-line{
  display:flex;
  align-items:center;
}
.profile-avatar{
  width:72px;
  height:72px;
}
.count-badge{
  min-width:22px;
  height:22px;
  border-radius:999px;
  padding:0 6px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background:var(--blue);
  color:#fff;
  font-size:12px;
  font-weight:800;
}
.chat-page{padding-bottom:24px}
.chat-layout{
  display:grid;
  grid-template-columns:320px 1fr;
  gap:16px;
}
.chat-threads{
  display:grid;
  gap:10px;
  align-content:start;
}
.thread-card{
  width:100%;
  border:1px solid var(--line);
  background:var(--soft);
  color:var(--text);
  border-radius:16px;
  padding:12px;
  display:grid;
  grid-template-columns:auto 1fr auto;
  gap:12px;
  align-items:center;
  cursor:pointer;
}
.thread-card.active{
  border-color:rgba(22,144,245,.45);
  box-shadow:0 0 0 2px rgba(22,144,245,.10);
}
.thread-copy{min-width:0}
.thread-name{font-weight:800}
.thread-preview{
  margin-top:4px;
  font-size:13px;
  color:var(--muted);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.chat-window{
  border:1px solid var(--line);
  border-radius:18px;
  background:var(--soft);
  display:grid;
  grid-template-rows:auto 1fr auto;
  min-height:520px;
}
.chat-header{
  padding:14px 16px;
  border-bottom:1px solid var(--line);
  display:flex;
  justify-content:space-between;
  gap:10px;
  color:var(--muted);
}
.chat-messages{
  padding:16px;
  overflow:auto;
  display:grid;
  gap:10px;
  align-content:start;
}
.chat-bubble{
  max-width:min(520px, 100%);
  padding:12px 14px;
  border-radius:16px 16px 16px 4px;
  background:var(--panel);
  border:1px solid var(--line);
}
.chat-bubble.mine{
  margin-left:auto;
  border-radius:16px 16px 4px 16px;
  background:rgba(22,144,245,.10);
}
.chat-bubble span{
  display:block;
  margin-top:6px;
  color:var(--muted);
  font-size:12px;
}
.chat-form{
  border-top:1px solid var(--line);
  padding:14px;
  display:flex;
  gap:10px;
}
.chat-form input{
  flex:1;
  background:var(--panel);
  border:1px solid var(--line);
  color:var(--text);
  border-radius:14px;
  padding:12px 14px;
}
.chat-hint{
  color:var(--muted);
  font-size:12px;
}
@media (max-width: 1100px){
  .login-page,.app-shell,.stats-grid,.two-grid,.form-grid{grid-template-columns:1fr}
  .main-area{padding:14px}
  .topbar h1{font-size:28px}
  .hero-banner h1{font-size:34px}
  .login-copy h1{font-size:46px}
  .login-copy h2{font-size:24px}
  .login-logo-lockup{margin-top:18px}
  .login-logo-image{width:64px;height:64px}
  .login-feature-row{grid-template-columns:1fr}
  .permission-grid{grid-template-columns:1fr}
  .media-grid{grid-template-columns:1fr}
  .detail-grid{grid-template-columns:1fr}
  .chat-layout{grid-template-columns:1fr}
}
@keyframes login-fade-up{
  from{opacity:0;transform:translateY(18px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes login-card-in{
  from{opacity:0;transform:translateY(24px) scale(.97)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
@keyframes login-float{
  0%,100%{transform:translateY(0) translateX(0)}
  50%{transform:translateY(-14px) translateX(8px)}
}
@keyframes particle-rise{
  0%{transform:translate3d(0,0,0) scale(.7);opacity:0}
  10%{opacity:.45}
  50%{opacity:.8}
  100%{transform:translate3d(20px,-110vh,0) scale(1.15);opacity:0}
}
@keyframes login-shine{
  0%{transform:translateX(0) translateY(0)}
  50%{transform:translateX(180%) translateY(26%)}
  100%{transform:translateX(360%) translateY(0)}
}
@keyframes login-spin{
  from{transform:rotate(0deg)}
  to{transform:rotate(360deg)}
}
@keyframes button-shimmer{
  0%{transform:translateX(-130%)}
  55%,100%{transform:translateX(130%)}
}
@keyframes panel-in{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:translateY(0)}
}
`;

export default App;
